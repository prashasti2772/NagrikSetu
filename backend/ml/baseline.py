"""Standard-library TF-IDF centroid baseline; offline and not auto-deployed."""
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from ml.data import dataset_digest, validate_splits
from ml.schema import DataValidationError

BASELINE_VERSION = "offline-tfidf-centroid-v1"
TASKS = ("category", "department", "priority")
FALLBACKS = {"category": "Other", "department": None, "priority": "medium"}


def features(text):
    words = re.findall(r"(?u)\b\w\w+\b", text.casefold())
    return words + [words[i] + " " + words[i + 1] for i in range(len(words) - 1)]


def vectorize(text, idf):
    counts = Counter(features(text))
    weights = {key: (1 + math.log(count)) * idf[key] for key, count in counts.items() if key in idf}
    norm = math.sqrt(sum(value * value for value in weights.values()))
    return {key: value / norm for key, value in weights.items()} if norm else {}


def dot(left, right):
    return sum(value * right.get(key, 0.0) for key, value in left.items())


def train_baseline(records, *, dataset_version, model_version):
    validate_splits(records)
    if not dataset_version.strip() or not model_version.strip():
        raise DataValidationError("Dataset and model version labels are required")
    training = sorted((row for row in records if row.split == "train"), key=lambda row: row.record_id)
    frequency = Counter(word for row in training for word in set(features(row.complaint_text)))
    if not frequency:
        raise DataValidationError("Training split contains no usable text features")
    idf = {key: math.log((1 + len(training)) / (1 + count)) + 1 for key, count in sorted(frequency.items())}
    vectors = [vectorize(row.complaint_text, idf) for row in training]
    models = {}
    for task in TASKS:
        sums = defaultdict(lambda: defaultdict(float))
        for row, vector in zip(training, vectors):
            for feature, value in vector.items():
                sums[getattr(row, task)][feature] += value
        centroids = {}
        for label, total in sorted(sums.items()):
            norm = math.sqrt(sum(value * value for value in total.values()))
            centroids[label] = {key: value / norm for key, value in sorted(total.items())} if norm else {}
        models[task] = centroids
    return {
        "schema_version": 1,
        "metadata": {
            "model_version": model_version, "dataset_version": dataset_version,
            "algorithm_version": BASELINE_VERSION, "dataset_sha256": dataset_digest(records),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "training_rows": len(training), "training_split": "train",
            "score_kind": "cosine_similarity_not_probability",
            "fallbacks": FALLBACKS,
            "limitations": "Offline baseline only; held-out measurement required. No production accuracy claim.",
        },
        "idf": idf, "centroids": models,
        "duplicate_rules": {"threshold": 0.65, "category_mismatch_factor": 0.75, "radius_km": 2.0},
    }


def predict(model, text):
    vector = vectorize(text, model["idf"])
    output = {}
    for task in TASKS:
        candidates = model["centroids"][task]
        ranked = sorted(((dot(vector, centroid), label) for label, centroid in candidates.items()),
                        key=lambda pair: (-pair[0], pair[1]))
        score, label = ranked[0] if ranked else (0.0, FALLBACKS[task])
        output[task] = label if score > 0 else FALLBACKS[task]
    return output


def distance_km(first, second):
    lat1, lat2 = math.radians(first.latitude), math.radians(second.latitude)
    angle = (math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2)
             * math.sin(math.radians(second.longitude - first.longitude) / 2) ** 2)
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1.0, max(0.0, angle))))


def duplicate_score(model, first, second):
    rules = model["duplicate_rules"]
    score = max(0.0, min(1.0, dot(vectorize(first.complaint_text, model["idf"]),
                                    vectorize(second.complaint_text, model["idf"]))))
    if first.category.casefold() != second.category.casefold():
        score *= rules["category_mismatch_factor"]
    if first.latitude is not None and second.latitude is not None:
        if distance_km(first, second) > rules["radius_km"]:
            return 0.0
    return score


def classification_metrics(actual, predicted):
    if not actual:
        return {"samples": 0, "accuracy": None, "macro_f1": None, "per_label": {}}
    labels = sorted(set(actual) | {value for value in predicted if value is not None})
    details = {}
    for label in labels:
        tp = sum(a == label and p == label for a, p in zip(actual, predicted))
        fp = sum(a != label and p == label for a, p in zip(actual, predicted))
        fn = sum(a == label and p != label for a, p in zip(actual, predicted))
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        details[label] = {"precision": precision, "recall": recall, "f1": f1,
                          "support": sum(value == label for value in actual)}
    return {"samples": len(actual), "accuracy": sum(a == p for a, p in zip(actual, predicted)) / len(actual),
            "macro_f1": sum(row["f1"] for row in details.values()) / len(details), "per_label": details}


def evaluate_baseline(model, records, *, split="test"):
    validate_splits(records)
    if split not in {"validation", "test"}:
        raise DataValidationError("Evaluation must use validation or test data")
    if model.get("schema_version") != 1 or model["metadata"]["dataset_sha256"] != dataset_digest(records):
        raise DataValidationError("Model and prepared dataset versions do not match")
    selected = [row for row in records if row.split == split]
    predictions = [predict(model, row.complaint_text) for row in selected]
    tasks = {task: classification_metrics([getattr(row, task) for row in selected],
                                         [prediction[task] for prediction in predictions]) for task in TASKS}
    by_id = {row.record_id: row for row in selected}
    pairs = {}
    for row in selected:
        for pair in row.duplicate_pairs:
            pairs[tuple(sorted((row.record_id, pair.other_id)))] = pair.is_duplicate
    tp = fp = fn = tn = 0
    for (first, second), actual in pairs.items():
        predicted = duplicate_score(model, by_id[first], by_id[second]) >= model["duplicate_rules"]["threshold"]
        tp += int(actual and predicted)
        fp += int(not actual and predicted)
        fn += int(actual and not predicted)
        tn += int(not actual and not predicted)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    duplicate = {"samples": len(pairs), "true_positive": tp, "false_positive": fp,
                 "false_negative": fn, "true_negative": tn,
                 "precision": precision if pairs else None, "recall": recall if pairs else None,
                 "f1": (2 * precision * recall / (precision + recall) if precision + recall else 0.0) if pairs else None,
                 "threshold": model["duplicate_rules"]["threshold"]}
    return {"model_version": model["metadata"]["model_version"],
            "dataset_version": model["metadata"]["dataset_version"],
            "dataset_sha256": dataset_digest(records), "split": split, "measured": True,
            "classification": tasks, "duplicate_detection": duplicate,
            "limitations": "Metrics describe only the supplied held-out labels; they are not production guarantees."}
