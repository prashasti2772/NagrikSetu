"""Strict de-identified JSONL contract. Errors never include submitted text."""
import json
from pathlib import Path
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, ValidationError, model_validator

Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9_.:-]{1,100}$")]
Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class DataValidationError(ValueError):
    """Safe summary; do not embed input rows, values, or Pydantic error output."""


class DuplicatePair(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    other_id: Identifier
    is_duplicate: bool


class DatasetRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    record_id: Identifier
    complaint_text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
    category: Label
    department: Label
    priority: Literal["low", "medium", "high", "critical"]
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    incident_group_id: Identifier | None = None
    duplicate_pairs: list[DuplicatePair] = Field(default_factory=list, max_length=1000)
    source: Label
    language: Annotated[str, StringConstraints(pattern=r"^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$", max_length=35)]
    split: Literal["unassigned", "train", "validation", "test"] = "unassigned"

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Coordinates require a complete pair or both absent")
        return self


def validate_records(records):
    if not records:
        raise DataValidationError("Dataset is empty")
    ids = {row.record_id for row in records}
    if len(ids) != len(records):
        raise DataValidationError("Dataset contains repeated record IDs")
    labels = {}
    for row in records:
        for pair in row.duplicate_pairs:
            if pair.other_id not in ids or pair.other_id == row.record_id:
                raise DataValidationError("Duplicate-pair reference is missing or self-referential")
            key = tuple(sorted((row.record_id, pair.other_id)))
            if key in labels and labels[key] != pair.is_duplicate:
                raise DataValidationError("Duplicate-pair labels conflict")
            labels[key] = pair.is_duplicate
    return records


def _strict_object(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("Repeated JSON field")
        result[key] = value
    return result


def _nonfinite(value):
    raise ValueError("Nonfinite JSON number")


def load_jsonl(path):
    records = []
    try:
        with Path(path).open(encoding="utf-8-sig") as stream:
            for number, line in enumerate(stream, 1):
                if not line.strip():
                    continue
                try:
                    data = json.loads(line, object_pairs_hook=_strict_object, parse_constant=_nonfinite)
                    records.append(DatasetRecord.model_validate(data))
                except (ValueError, TypeError, ValidationError):
                    # Pydantic/JSON messages can contain personal text; never forward them.
                    raise DataValidationError(f"Invalid dataset row {number}; check the documented schema") from None
    except UnicodeError:
        raise DataValidationError("Dataset must be valid UTF-8") from None
    return validate_records(records)


def write_jsonl(path, records):
    with Path(path).open("x", encoding="utf-8") as stream:
        for row in sorted(records, key=lambda item: item.record_id):
            stream.write(row.model_dump_json() + "\n")
