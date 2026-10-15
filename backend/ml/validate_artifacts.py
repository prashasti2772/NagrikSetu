"""Validate an operator-supplied JSON bundle without enabling it in the app."""
import argparse
from pathlib import Path

from app.services.ml_artifacts import FILES, _load_bundle


def main():
    parser = argparse.ArgumentParser(description="Validate a reviewed JSON serving bundle; no prediction data or model execution")
    parser.add_argument("--directory", required=True)
    args = parser.parse_args()
    try:
        directory = Path(args.directory).resolve()
        fingerprint = tuple((name, (directory / name).stat().st_mtime_ns, (directory / name).stat().st_size)
                            for name in (*FILES, "model_metadata.json"))
        _load_bundle(str(directory), fingerprint)
    except (OSError, ValueError, TypeError, KeyError, AttributeError, OverflowError, RecursionError):
        parser.exit(2, "Artifact bundle invalid; check the documented JSON schema, checksums and held-out metrics. No content was logged.\n")
    print("JSON artifact bundle valid. Activation requires an explicit environment flag and restart.")


if __name__ == "__main__":
    main()
