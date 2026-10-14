"""Task-specific CSV validation and deterministic preparation; no invented labels."""
import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

from ml.data import Groups, normalized_text
from ml.near_duplicates import near_text_pairs
from ml.schema import DataValidationError

COLUMNS = {
    "complaint_category": ("text", "language", "category", "source", "source_record_id"),
    "department_routing": ("category", "issue_subtype", "department", "state_or_city_context", "source"),
    "priority_dataset": ("text", "category", "safety_risk", "service_disruption", "affected_scope", "priority", "source"),
    "duplicate_pairs": ("text_a", "text_b", "category_a", "category_b", "distance_m", "time_delta_hours", "same_incident", "source"),
}
OPTIONAL_COLUMNS = {"record_id", "incident_group_id", "split"}
TEXT_COLUMNS = {"text", "text_a", "text_b"}


def _digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def load_csv(path, task):
    if task not in COLUMNS:
        raise DataValidationError("Unknown CSV task")
    rows, seen = [], {}
    try:
        with Path(path).open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            header = reader.fieldnames or []
            if len(header) != len(set(header)) or not set(COLUMNS[task]) <= set(header) or set(header) - set(COLUMNS[task]) - OPTIONAL_COLUMNS:
                raise DataValidationError("CSV columns do not match the documented task schema")
            for number, raw in enumerate(reader, 2):
                try:
                    if None in raw or any(value is None for value in raw.values()):
                        raise ValueError()
                    raw = {key: value.strip() for key, value in raw.items()}
                    data = {key: raw[key] for key in COLUMNS[task]}
                    for key, value in data.items():
                        if key in {"distance_m", "time_delta_hours"}:
                            numeric = float(value) if value else None
                            if numeric is not None and (not math.isfinite(numeric) or numeric < 0):
                                raise ValueError()
                            data[key] = numeric
                        elif key == "same_incident":
                            if value.lower() not in {"true", "false", "0", "1"}:
                                raise ValueError()
                            data[key] = value.lower() in {"true", "1"}
                        elif not value or len(value) > (10000 if key in TEXT_COLUMNS else 200):
                            raise ValueError()
                    if task == "complaint_category":
                        if not re.fullmatch(r"[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*", data["language"]) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,100}", data["source_record_id"]):
                            raise ValueError()
                    if task == "priority_dataset" and data["priority"] not in {"low", "medium", "high", "critical"}:
                        raise ValueError()
                    group = raw.get("incident_group_id") or None
                    if group and not re.fullmatch(r"[A-Za-z0-9_.:-]{1,100}", group):
                        raise ValueError()
                    split = raw.get("split") or "unassigned"
                    if split not in {"unassigned", "train", "validation", "test"}:
                        raise ValueError()
                    basis = [data["source"], data["source_record_id"]] if task == "complaint_category" else data
                    identifier = raw.get("record_id") or "csv-" + _digest(basis)
                    if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,100}", identifier):
                        raise ValueError()
                    row = {"schema_version": 1, "task": task, "record_id": identifier,
                           "data": data, "incident_group_id": group, "split": split}
                    if identifier in seen and seen[identifier] != row:
                        raise ValueError()
                    seen[identifier] = row
                    rows.append(row)
                except (ValueError, TypeError, OverflowError):
                    raise DataValidationError(f"Invalid CSV row {number}; check the task schema") from None
    except (UnicodeError, csv.Error):
        raise DataValidationError("CSV must contain valid UTF-8 records") from None
    if not rows:
        raise DataValidationError("Dataset is empty")
    return rows


def _texts(row):
    data = row["data"]
    if row["task"] == "duplicate_pairs":
        return [data["text_a"], data["text_b"]]
    if "text" in data:
        return [data["text"]]
    return [data["category"] + " " + data["issue_subtype"]]


def prepare_csv(rows, *, seed="nagriksetu-v1", assign=True):
    """Exact rows deduplicate; near variants are retained in the same split."""
    canonical, aliases, pair_labels = {}, {}, {}
    for row in sorted(rows, key=lambda item: item["record_id"]):
        normalized = dict(row["data"])
        for key in TEXT_COLUMNS & normalized.keys():
            normalized[key] = normalized_text(normalized[key])
        if row["task"] == "duplicate_pairs":
            endpoints = sorted([(normalized["text_a"], normalized["category_a"]),
                                (normalized["text_b"], normalized["category_b"])])
            normalized.update(text_a=endpoints[0][0], category_a=endpoints[0][1],
                              text_b=endpoints[1][0], category_b=endpoints[1][1])
            pair_key = _digest({key: value for key, value in normalized.items() if key != "same_incident"})
            if pair_key in pair_labels and pair_labels[pair_key] != normalized["same_incident"]:
                raise DataValidationError("Duplicate CSV pair labels conflict")
            pair_labels[pair_key] = normalized["same_incident"]
        key = _digest([normalized, row["incident_group_id"], row["split"]])
        kept = canonical.setdefault(key, row)
        aliases[row["record_id"]] = kept["record_id"]
    unique = sorted(canonical.values(), key=lambda row: row["record_id"])
    groups = Groups(row["record_id"] for row in unique)
    incident_first, text_items, owner = {}, [], {}
    for row in unique:
        identifier = row["record_id"]
        if row["incident_group_id"]:
            groups.join(identifier, incident_first.setdefault(row["incident_group_id"], identifier))
        for index, value in enumerate(_texts(row)):
            endpoint = identifier + ":" + str(index)
            text_items.append((endpoint, value))
            owner[endpoint] = identifier
    for first, second in near_text_pairs(text_items):
        groups.join(owner[first], owner[second])
    components = defaultdict(list)
    for row in unique:
        components[groups.find(row["record_id"])].append(row)
    components = list(components.values())
    existing = {row["split"] for row in unique}
    if existing != {"unassigned"}:
        if "unassigned" in existing:
            raise DataValidationError("Do not mix assigned and unassigned CSV splits")
        for component in components:
            if len({row["split"] for row in component}) != 1:
                raise DataValidationError("Related CSV records leak across splits")
    if assign and existing == {"unassigned"}:
        if len(components) < 3:
            raise DataValidationError("At least three independent CSV groups are required")
        components.sort(key=lambda group: _digest([str(seed), sorted(row["record_id"] for row in group)]))
        count = len(components)
        training = min(count - 2, max(1, int(count * 0.7)))
        validation = min(count - training - 1, max(1, int(count * 0.15)))
        unique = [{**row, "split": "train" if index < training else "validation" if index < training + validation else "test"}
                  for index, group in enumerate(components) for row in group]
    unique.sort(key=lambda row: row["record_id"])
    if assign and {row["split"] for row in unique} != {"train", "validation", "test"}:
        raise DataValidationError("Prepared CSV requires train, validation and test splits")
    manifest = {"schema_version": 1, "task": unique[0]["task"], "seed": str(seed), "input_rows": len(rows),
                "prepared_rows": len(unique), "split_counts": dict(Counter(row["split"] for row in unique)),
                "dataset_sha256": _digest(unique), "record_aliases": aliases,
                "near_variant_policy": "shared word trigram and >=0.95 character similarity; matching numeric tokens; variants grouped, not removed"}
    return unique, manifest


def write_prepared_csv(path, rows):
    with Path(path).open("x", encoding="utf-8") as stream:
        for row in rows:
            stream.write(json.dumps(row, ensure_ascii=False, sort_keys=True, allow_nan=False) + "\n")
