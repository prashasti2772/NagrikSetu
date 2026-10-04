"""Synthetic fixtures only: schema, grouping, holdout integrity and actual CLI use."""
import json
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from ml.baseline import classification_metrics, evaluate_baseline, predict, train_baseline
from ml.data import assign_splits, deduplicate, related_components, validate_splits
from ml.schema import DataValidationError, DatasetRecord, DuplicatePair, load_jsonl, write_jsonl

BACKEND = Path(__file__).resolve().parents[1]


def record(identifier, text=None, **changes):
    return DatasetRecord(record_id=identifier, complaint_text=text or f"Road repair civic fixture {identifier}",
                         category=changes.pop("category", "Roads"), department=changes.pop("department", "Roads"),
                         priority=changes.pop("priority", "medium"), source="synthetic-unit-fixture", language="en",
                         **changes)


def prepared_fixture():
    return [
        record("train-road", "road pothole damaged asphalt repair", split="train"),
        record("train-water", "water pipe leaking supply broken", category="Water", department="Water", split="train"),
        record("val-road", "road pothole validationonlytoken", split="validation"),
        record("val-water", "water pipe review scenario", category="Water", department="Water", split="validation"),
        record("test-road", "road pothole damaged testonlytoken", split="test", incident_group_id="test-road-group",
               duplicate_pairs=[DuplicatePair(other_id="test-road-other", is_duplicate=True),
                                DuplicatePair(other_id="test-water", is_duplicate=False)]),
        record("test-road-other", "road pothole damaged asphalt", split="test", incident_group_id="test-road-group"),
        record("test-water", "water pipe leaking supply", category="Water", department="Water", split="test"),
    ]


class MLPipelineTests(unittest.TestCase):
    def test_jsonl_schema_validates_optional_location_and_hides_invalid_values(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "input.jsonl"
            row = record("valid").model_dump()
            path.write_text(json.dumps(row) + "\n", encoding="utf-8")
            self.assertIsNone(load_jsonl(path)[0].latitude)
            for changes in ({"latitude": 91.0, "longitude": 0.0}, {"latitude": 0.0},
                            {"latitude": math.nan, "longitude": 0.0}, {"priority": "urgent"},
                            {"complaint_text": " "}, {"unknown_private_field": "DO-NOT-LOG-INPUT"},
                            {"complaint_text": "DO-NOT-LOG-INPUT", "record_id": "invalid identifier"}):
                path.write_text(json.dumps({**row, **changes}), encoding="utf-8")
                with self.assertRaises(DataValidationError) as raised:
                    load_jsonl(path)
                self.assertNotIn("DO-NOT-LOG-INPUT", str(raised.exception))
                self.assertIn("row 1", str(raised.exception))

    def test_missing_self_and_conflicting_duplicate_labels_are_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "input.jsonl"
            for rows in ([record("a", duplicate_pairs=[DuplicatePair(other_id="missing", is_duplicate=True)])],
                         [record("a", duplicate_pairs=[DuplicatePair(other_id="a", is_duplicate=True)])],
                         [record("a", duplicate_pairs=[DuplicatePair(other_id="b", is_duplicate=True)]),
                          record("b", duplicate_pairs=[DuplicatePair(other_id="a", is_duplicate=False)])]):
                path.write_text("\n".join(row.model_dump_json() for row in rows), encoding="utf-8")
                with self.assertRaises(DataValidationError):
                    load_jsonl(path)

    def test_deduplication_preserves_aliases_pairs_and_distinct_incidents(self):
        rows = [record("a", "Broken road pothole", incident_group_id="one"),
                record("a-copy", "BROKEN road, pothole!", incident_group_id="one",
                       duplicate_pairs=[DuplicatePair(other_id="b", is_duplicate=True)]),
                record("b", "Pothole at junction", incident_group_id="one",
                       duplicate_pairs=[DuplicatePair(other_id="a-copy", is_duplicate=True)]),
                record("different-incident", "Broken road pothole", incident_group_id="two")]
        unique, aliases = deduplicate(rows)
        self.assertEqual(len(unique), 3)
        self.assertEqual(aliases["a-copy"], "a")
        self.assertEqual(aliases["different-incident"], "different-incident")
        by_id = {row.record_id: row for row in unique}
        self.assertEqual(by_id["a"].duplicate_pairs[0].other_id, "b")
        self.assertEqual(by_id["b"].duplicate_pairs[0].other_id, "a")

    def test_deduplication_refuses_to_destroy_negative_pair_evidence(self):
        rows = [record("a", "road issue", duplicate_pairs=[DuplicatePair(other_id="b", is_duplicate=False)]),
                record("b", "road issue")]
        with self.assertRaises(DataValidationError):
            deduplicate(rows)

    def test_group_aware_split_is_deterministic_and_keeps_pairs_and_repeated_text_together(self):
        rows = [record("g1-a", "Pothole north", incident_group_id="g1"),
                record("g1-b", "Road damaged northern junction", incident_group_id="g1"),
                record("g2-a", "Drain blocked east", duplicate_pairs=[DuplicatePair(other_id="g2-b", is_duplicate=False)]),
                record("g2-b", "Street light east"),
                record("repeat-a", "Same generic report"), record("repeat-b", "SAME generic report!"),
                record("g4"), record("g5"), record("g6")]
        first = assign_splits(rows, seed="fixture-seed")
        second = assign_splits(list(reversed(rows)), seed="fixture-seed")
        self.assertEqual([row.model_dump() for row in first], [row.model_dump() for row in second])
        self.assertEqual({row.split for row in first}, {"train", "validation", "test"})
        for component in related_components(first):
            self.assertEqual(len({row.split for row in component}), 1)
        validate_splits(first)

    def test_leakage_and_insufficient_groups_fail_explicitly(self):
        with self.assertRaises(DataValidationError):
            assign_splits([record("a"), record("b")])
        rows = prepared_fixture()
        leaked = rows + [record("leak", "road pothole damaged asphalt repair", split="test")]
        with self.assertRaises(DataValidationError):
            validate_splits(leaked)
        contradictory = [record("a", incident_group_id="same",
                                duplicate_pairs=[DuplicatePair(other_id="b", is_duplicate=False)]),
                         record("b", incident_group_id="same"), record("c"), record("d")]
        with self.assertRaises(DataValidationError):
            assign_splits(contradictory)

    def test_training_uses_train_only_and_evaluation_reports_measured_heldout_metrics(self):
        rows = prepared_fixture()
        model = train_baseline(rows, dataset_version="synthetic-v1", model_version="fixture-model-v1")
        self.assertEqual(model["metadata"]["training_rows"], 2)
        self.assertNotIn("validationonlytoken", model["idf"])
        self.assertNotIn("testonlytoken", model["idf"])
        self.assertEqual(predict(model, "completelyunknownword"), {"category": "Other", "department": None, "priority": "medium"})
        measured = evaluate_baseline(model, rows)
        self.assertTrue(measured["measured"])
        self.assertEqual(measured["split"], "test")
        self.assertEqual(measured["classification"]["category"]["samples"], 3)
        self.assertEqual(measured["duplicate_detection"]["samples"], 2)
        self.assertNotIn("complaint_text", json.dumps(measured))
        self.assertNotIn("test-road", json.dumps(measured))
        for task in measured["classification"].values():
            self.assertGreaterEqual(task["accuracy"], 0)
            self.assertLessEqual(task["macro_f1"], 1)
        validation = evaluate_baseline(model, rows, split="validation")
        self.assertEqual(validation["duplicate_detection"]["samples"], 0)
        self.assertIsNone(validation["duplicate_detection"]["f1"])
        with self.assertRaises(DataValidationError):
            evaluate_baseline(model, rows, split="train")
        changed = [row.model_copy(update={"source": "another-reviewed-version"}) for row in rows]
        with self.assertRaises(DataValidationError):
            evaluate_baseline(model, changed)

    def test_metric_math_has_known_confusion_counts_without_fabricating_empty_results(self):
        metric = classification_metrics(["a", "a", "b", "b"], ["a", "b", "b", "b"])
        self.assertEqual(metric["accuracy"], 0.75)
        self.assertEqual(metric["per_label"]["a"]["precision"], 1.0)
        self.assertEqual(metric["per_label"]["a"]["recall"], 0.5)
        self.assertAlmostEqual(metric["macro_f1"], (2 / 3 + 0.8) / 2)
        self.assertIsNone(classification_metrics([], [])["accuracy"])

    def test_prepare_train_evaluate_entrypoints_work_with_synthetic_files_only(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            original, prepared = directory / "raw.jsonl", directory / "prepared.jsonl"
            manifest, model, metrics = directory / "manifest.json", directory / "model.json", directory / "metrics.json"
            write_jsonl(original, [record(f"synthetic-{index}", f"Road pothole example scenario {index}") for index in range(12)])
            commands = [
                ["ml.prepare", "--input", str(original), "--output", str(prepared), "--manifest", str(manifest)],
                ["ml.train", "--dataset", str(prepared), "--output", str(model), "--dataset-version", "synthetic-v1", "--model-version", "test-v1"],
                ["ml.evaluate", "--dataset", str(prepared), "--model", str(model), "--output", str(metrics)],
            ]
            for command in commands:
                result = subprocess.run([sys.executable, "-m", *command], cwd=BACKEND, capture_output=True, text=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertNotIn("Road pothole example", result.stdout + result.stderr)
            self.assertEqual(json.loads(manifest.read_text())["input_rows"], 12)
            self.assertTrue(json.loads(metrics.read_text())["measured"])
            repeated = subprocess.run([sys.executable, "-m", *commands[0]], cwd=BACKEND, capture_output=True, text=True, timeout=30)
            self.assertEqual(repeated.returncode, 2)
