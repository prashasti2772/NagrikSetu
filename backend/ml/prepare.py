"""python -m ml.prepare --input INPUT.jsonl --output PREPARED.jsonl --manifest MANIFEST.json"""
import argparse
import json
from collections import Counter
from pathlib import Path
from ml.data import assign_splits, dataset_digest, deduplicate
from ml.schema import DataValidationError, load_jsonl, write_jsonl


def main():
    parser = argparse.ArgumentParser(description="Prepare a reviewed, de-identified civic dataset")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--seed", default="nagriksetu-v1")
    args = parser.parse_args()
    try:
        if Path(args.output).exists() or Path(args.manifest).exists():
            raise DataValidationError("Output/manifest already exists; choose new versioned paths")
        original = load_jsonl(args.input)
        unique, aliases = deduplicate(original)
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
