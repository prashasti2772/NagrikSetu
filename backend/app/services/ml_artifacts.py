"""Opt-in, bounded JSON model serving. Invalid bundles always use local fallback.

This module never executes serialized Python, trains, downloads, or logs artifacts.
The exact seven-file bundle contract is documented in ml/ARTIFACTS.md.
"""
import hashlib
import json
import math
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.config import BACKEND_DIR
from ml.baseline import dot, vectorize

TASKS = ("category", "department", "priority")
FILES = tuple(task + "_model.json" for task in (*TASKS, "duplicate")) + ("label_mapping.json", "metrics.json")
MAX_FILE_BYTES = 10 * 1024 * 1024


def _object(items):
    result = {}
    for key, value in items:
        if key in result:
            raise ValueError("Repeated field")
        result[key] = value
    return result


def _nonfinite(value):
    raise ValueError("Nonfinite number")


def _number(value, lower, upper):
    if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not lower <= value <= upper:
        raise ValueError("Invalid model number")
    return value


def _label(value, maximum=200):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError("Invalid model label")
    return value


def _json_file(directory, name):
    path = directory / name
    if path.resolve().parent != directory:
        raise ValueError("Artifact escapes bundle directory")
    with path.open("rb") as stream:
        raw = stream.read(MAX_FILE_BYTES + 1)
    if len(raw) > MAX_FILE_BYTES:
        raise ValueError("Artifact too large")
    data = json.loads(raw, object_pairs_hook=_object, parse_constant=_nonfinite)
    if not isinstance(data, dict):
        raise ValueError("Invalid artifact object")
    return data, hashlib.sha256(raw).hexdigest()


def _idf(value):
    if not isinstance(value, dict) or not 1 <= len(value) <= 50000:
        raise ValueError("Invalid model vocabulary")
    for feature, weight in value.items():
        _label(feature)
        _number(weight, 0.000001, 1000000)
    return value


@dataclass(frozen=True)
class Prediction:
    label: str
    score: float
    keywords: list[str]
    model_version: str


class ArtifactBundle:
    def __init__(self, models, mapping, metadata):
        self.models, self.mapping = models, mapping
        self.version = metadata["model_version"]

    def predict(self, task, text):
        model = self.models[task]
        vector = vectorize(text, model["idf"])
        ranked = sorted(((dot(vector, centroid), identifier) for identifier, centroid in model["centroids"].items()),
                        key=lambda pair: (-pair[0], pair[1]))
        score, identifier = ranked[0]
        if score < model["minimum_score"] or not vector:
            return None
        centroid = model["centroids"][identifier]
        keywords = sorted((feature for feature in vector if feature in centroid),
                          key=lambda feature: (-vector[feature] * centroid[feature], feature))[:5]
        return Prediction(self.mapping[task][identifier], min(1.0, max(0.0, score)), keywords, self.version)

    def duplicate(self, first, second):
        model = self.models["duplicate"]
        score = dot(vectorize(first, model["idf"]), vectorize(second, model["idf"]))
        if score < model["minimum_score"]:
            return None
        return Prediction("same_incident", min(1.0, max(0.0, score)), [], self.version)


@lru_cache(maxsize=2)
def _load_bundle(directory_name, fingerprint):
    directory = Path(directory_name)
    metadata, _ = _json_file(directory, "model_metadata.json")
    if metadata.get("schema_version") != 1 or metadata.get("format") != "nagriksetu-json-tfidf-v1":
        raise ValueError("Unsupported artifact format")
    _label(metadata["model_version"], 50)
    _label(metadata["dataset_version"])
    if not re.fullmatch(r"[a-f0-9]{64}", metadata["dataset_sha256"]):
        raise ValueError("Invalid dataset digest")
    if type(metadata["training_rows"]) is not int or metadata["training_rows"] < 1 or metadata.get("training_split") != "train":
        raise ValueError("Missing training provenance")
    if set(metadata["artifacts"]) != set(FILES):
        raise ValueError("Incomplete bundle manifest")
    contents = {}
    for name in FILES:
        contents[name], checksum = _json_file(directory, name)
        if metadata["artifacts"][name] != checksum:
            raise ValueError("Artifact digest mismatch")
    mapping = contents["label_mapping.json"]
    if set(mapping) != {"schema_version", *TASKS} or mapping["schema_version"] != 1:
        raise ValueError("Invalid label mapping")
    models = {}
    for task in (*TASKS, "duplicate"):
        model = contents[task + "_model.json"]
        expected = {"schema_version", "task", "model_version", "model_type", "idf", "minimum_score"}
        if task != "duplicate":
            expected.add("centroids")
        if set(model) != expected or model["schema_version"] != 1 or model["task"] != task or model["model_version"] != metadata["model_version"]:
            raise ValueError("Model contract mismatch")
        expected_type = "tfidf_pair_cosine_v1" if task == "duplicate" else "tfidf_centroid_v1"
        if model["model_type"] != expected_type:
            raise ValueError("Unsupported model type")
        _number(model["minimum_score"], 0.05, 1)
        _idf(model["idf"])
        if task != "duplicate":
            labels = mapping[task]
            centroids = model["centroids"]
            if not isinstance(labels, dict) or not isinstance(centroids, dict) or not 1 <= len(labels) <= 100 or set(labels) != set(centroids):
                raise ValueError("Invalid class mapping")
            for identifier, label in labels.items():
                _label(identifier)
                _label(label)
                if task == "priority" and label not in {"low", "medium", "high", "critical"}:
                    raise ValueError("Invalid priority label")
                weights = centroids[identifier]
                if not isinstance(weights, dict) or not weights or not set(weights) <= set(model["idf"]):
                    raise ValueError("Invalid centroid features")
                for weight in weights.values():
                    _number(weight, 0, 1000000)
                norm = math.sqrt(sum(weight * weight for weight in weights.values()))
                if norm <= 0:
                    raise ValueError("Empty centroid")
                centroids[identifier] = {feature: weight / norm for feature, weight in weights.items()}
        models[task] = model
    metrics = contents["metrics.json"]
    if metrics.get("measured") is not True or metrics.get("split") not in {"validation", "test"}:
        raise ValueError("Held-out metrics are required")
    for key in ("model_version", "dataset_version", "dataset_sha256"):
        if metrics.get(key) != metadata[key]:
            raise ValueError("Metrics provenance mismatch")
    for task in TASKS:
        values = metrics["classification"][task]
        if type(values["samples"]) is not int or values["samples"] < 1:
            raise ValueError("Missing evaluation samples")
        _number(values["accuracy"], 0, 1)
        _number(values["macro_f1"], 0, 1)
    return ArtifactBundle(models, mapping, metadata)


def get_trained_models():
    if os.getenv("ENABLE_TRAINED_ML", "false").strip().lower() not in {"1", "true"}:
        return None
    try:
        configured = Path(os.getenv("ML_ARTIFACT_DIR", "ml/artifacts"))
        directory = (configured if configured.is_absolute() else BACKEND_DIR / configured).resolve()
        fingerprint = tuple((name, (directory / name).stat().st_mtime_ns, (directory / name).stat().st_size)
                            for name in (*FILES, "model_metadata.json"))
        return _load_bundle(str(directory), fingerprint)
    except (OSError, ValueError, TypeError, KeyError, AttributeError, OverflowError, RecursionError):
        return None
