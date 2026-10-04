"""Conservative deduplication and deterministic leakage-resistant splitting."""
import hashlib
import json
import re
from collections import defaultdict
from ml.schema import DataValidationError, DuplicatePair, validate_records


def normalized_text(text):
    return " ".join(re.findall(r"\w+", text.casefold(), flags=re.UNICODE))


class Groups:
    def __init__(self, ids):
        self.parents = {value: value for value in ids}

    def find(self, value):
        if self.parents[value] != value:
            self.parents[value] = self.find(self.parents[value])
        return self.parents[value]

    def join(self, first, second):
        a, b = sorted((self.find(first), self.find(second)))
        self.parents[b] = a


def deduplicate(records):
    """Merge only exact normalized rows with identical labels/provenance/location.

    Different incident IDs, sources, locations, labels or existing splits preserve
    separate rows. Return an alias map so callers retain provenance and pair links.
    """
    validate_records(records)
    canonical, aliases, members = {}, {}, defaultdict(list)
    for row in sorted(records, key=lambda item: item.record_id):
        data = row.model_dump(exclude={"record_id", "duplicate_pairs"})
        data["complaint_text"] = normalized_text(row.complaint_text) or row.complaint_text.casefold()
        key = json.dumps(data, sort_keys=True, ensure_ascii=False)
        keep = canonical.setdefault(key, row)
        aliases[row.record_id] = keep.record_id
        members[keep.record_id].append(row)
    output = []
    for keep_id, rows in members.items():
        pairs = {}
        for row in rows:
            for pair in row.duplicate_pairs:
                other = aliases[pair.other_id]
                if other == keep_id:
                    if not pair.is_duplicate:
                        raise DataValidationError("Exact-row deduplication conflicts with a negative pair label")
                    continue
                if other in pairs and pairs[other] != pair.is_duplicate:
                    raise DataValidationError("Deduplication would create conflicting pair labels")
                pairs[other] = pair.is_duplicate
        output.append(rows[0].model_copy(update={"duplicate_pairs": [
            DuplicatePair(other_id=other, is_duplicate=label) for other, label in sorted(pairs.items())
        ]}))
    return validate_records(output), aliases


def related_components(records):
    """Keep incident groups, all labelled pair endpoints and repeated text together."""
    validate_records(records)
    groups = Groups(row.record_id for row in records)
    incident_first, text_first = {}, {}
    for row in sorted(records, key=lambda item: item.record_id):
        if row.incident_group_id is not None:
            groups.join(row.record_id, incident_first.setdefault(row.incident_group_id, row.record_id))
        normalized = normalized_text(row.complaint_text)
        if normalized:
            groups.join(row.record_id, text_first.setdefault(normalized, row.record_id))
        for pair in row.duplicate_pairs:
            groups.join(row.record_id, pair.other_id)
    # Positive incident labels must be internally consistent with negative labels.
    positive = Groups(row.record_id for row in records)
    for row in records:
        if row.incident_group_id is not None:
            positive.join(row.record_id, incident_first[row.incident_group_id])
        for pair in row.duplicate_pairs:
            if pair.is_duplicate:
                positive.join(row.record_id, pair.other_id)
    for row in records:
        for pair in row.duplicate_pairs:
            if not pair.is_duplicate and positive.find(row.record_id) == positive.find(pair.other_id):
                raise DataValidationError("Negative pair conflicts with incident/positive-pair labels")
    result = defaultdict(list)
    for row in records:
        result[groups.find(row.record_id)].append(row)
    return [sorted(rows, key=lambda row: row.record_id) for _, rows in sorted(result.items())]


def assign_splits(records, *, seed="nagriksetu-v1", train_ratio=0.7, validation_ratio=0.15):
    if not 0 < train_ratio < 1 or not 0 < validation_ratio < 1 or train_ratio + validation_ratio >= 1:
        raise DataValidationError("Split ratios must leave nonempty train, validation and test fractions")
    components = related_components(records)
    if len(components) < 3:
        raise DataValidationError("At least three independent groups are required for train/validation/test")
    components.sort(key=lambda rows: hashlib.sha256(
        (str(seed) + "\0" + "\0".join(row.record_id for row in rows)).encode()).hexdigest())
    count = len(components)
    train_count = min(count - 2, max(1, int(count * train_ratio)))
    validation_count = min(count - train_count - 1, max(1, int(count * validation_ratio)))
    result = []
    for index, rows in enumerate(components):
        split = "train" if index < train_count else (
            "validation" if index < train_count + validation_count else "test")
        result.extend(row.model_copy(update={"split": split}) for row in rows)
    return sorted(result, key=lambda row: row.record_id)


def validate_splits(records):
    for rows in related_components(records):
        splits = {row.split for row in rows}
        if "unassigned" in splits or len(splits) != 1:
            raise DataValidationError("Dataset has unassigned rows or related records across splits")
    if {row.split for row in records} != {"train", "validation", "test"}:
        raise DataValidationError("Dataset must contain train, validation and test splits")
    return records


def dataset_digest(records):
    encoded = "\n".join(json.dumps(row.model_dump(), sort_keys=True, ensure_ascii=False)
                         for row in sorted(records, key=lambda item: item.record_id))
    return hashlib.sha256(encoded.encode()).hexdigest()
