"""Measure the validation/test split only; emit no per-citizen predictions."""
import argparse
import json
from pathlib import Path
from ml.baseline import evaluate_baseline
from ml.schema import DataValidationError, load_jsonl


def main():
    parser = argparse.ArgumentParser(description="Measure held-out local baseline metrics")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--split", choices=("validation", "test"), default="test")
    args = parser.parse_args()
    try:
        model = json.loads(Path(args.model).read_text(encoding="utf-8"))
        metrics = evaluate_baseline(model, load_jsonl(args.dataset), split=args.split)
        with Path(args.output).open("x", encoding="utf-8") as stream:
            json.dump(metrics, stream, indent=2, sort_keys=True, allow_nan=False)
    except (DataValidationError, OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        parser.exit(2, "Evaluation failed; check artifact, matching dataset and held-out split. No row data was logged.\n")
    print("Measured held-out metrics written; no production accuracy claim is implied.")


if __name__ == "__main__":
    main()
