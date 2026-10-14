"""python -m ml.prepare --input INPUT.jsonl --output PREPARED.jsonl --manifest MANIFEST.json"""
import argparse
import json
from collections import Counter
from pathlib import Path
from ml.data import assign_splits, dataset_digest, deduplicate
from ml.schema import DataValidationError, load_jsonl, write_jsonl
from ml.csv_data import COLUMNS, load_csv, prepare_csv, write_prepared_csv


def main():
    parser = argparse.ArgumentParser(description="Prepare a reviewed, de-identified civic dataset")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output")
    parser.add_argument("--manifest")
    parser.add_argument("--seed", default="nagriksetu-v1")
    parser.add_argument("--format", choices=("jsonl", "csv"), default="jsonl")
    parser.add_argument("--task", choices=tuple(COLUMNS))
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    try:
        if args.format == "csv" and not args.task:
            raise DataValidationError("CSV input requires a task")
        if args.format == "jsonl" and args.task:
            raise DataValidationError("Task selectors are only used with CSV")
        if not args.validate_only and (not args.output or not args.manifest):
            raise DataValidationError("Preparation requires output and manifest paths")
        if args.output and args.manifest and (Path(args.output).resolve() == Path(args.manifest).resolve() or
                Path(args.output).exists() or Path(args.manifest).exists()):
            raise DataValidationError("Output/manifest already exists; choose new versioned paths")
        if args.format == "csv":
            original = load_csv(args.input, args.task)
            prepared, manifest = prepare_csv(original, seed=args.seed, assign=not args.validate_only)
            if args.validate_only:
                print("CSV task dataset validated; no row data was logged or written.")
                return
            write_prepared_csv(args.output, prepared)
        else:
            original = load_jsonl(args.input)
            unique, aliases = deduplicate(original)
            if args.validate_only:
                from ml.data import related_components
                related_components(unique)
                print("JSONL dataset validated; no row data was logged or written.")
                return
            prepared = assign_splits(unique, seed=args.seed)
            manifest = {"schema_version": 1, "seed": args.seed, "input_rows": len(original),
                        "prepared_rows": len(prepared), "split_counts": dict(Counter(row.split for row in prepared)),
                        "dataset_sha256": dataset_digest(prepared), "record_aliases": aliases}
            write_jsonl(args.output, prepared)
        with Path(args.manifest).open("x", encoding="utf-8") as stream:
            json.dump(manifest, stream, indent=2, sort_keys=True)
    except (DataValidationError, OSError):
        parser.exit(2, "Dataset preparation failed; check schema, group counts and unused output paths. No row data was logged.\n")
    print("Prepared dataset and provenance manifest written.")


if __name__ == "__main__":
    main()
