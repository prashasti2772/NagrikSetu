"""Train an opt-in local baseline from only the prepared train split."""
import argparse
import json
from pathlib import Path
from ml.baseline import train_baseline
from ml.schema import DataValidationError, load_jsonl


def main():
    parser = argparse.ArgumentParser(description="Train a local TF-IDF baseline; no network or app deployment")
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--model-version", required=True)
    args = parser.parse_args()
    try:
        model = train_baseline(load_jsonl(args.dataset), dataset_version=args.dataset_version,
                               model_version=args.model_version)
        with Path(args.output).open("x", encoding="utf-8") as stream:
            json.dump(model, stream, indent=2, sort_keys=True, allow_nan=False)
    except (DataValidationError, OSError):
        parser.exit(2, "Training failed; validate the prepared dataset and use a new output path. No row data was logged.\n")
    print("Offline baseline artifact written; production behavior is unchanged.")


if __name__ == "__main__":
    main()
