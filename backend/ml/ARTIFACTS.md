# Optional JSON serving bundle

No trained model or measured production result is supplied by this repository.
The API uses its existing local rules unless an operator installs a reviewed bundle
and explicitly enables it. No downloads, training, pickle, joblib, Python imports,
or executable model deserialization occur during artifact loading.

The supported layout is exactly:

```text
ml/artifacts/<reviewed-version>/
  category_model.json
  department_model.json
  priority_model.json
  duplicate_model.json
  label_mapping.json
  model_metadata.json
  metrics.json
```

Each JSON file is at most 10 MB. Duplicate keys, nonfinite numbers, invalid labels,
unknown model formats, missing files, mismatched versions/checksums, or mismatched
evaluation provenance disable the entire bundle. Paths must stay within the bundle.
JSON is non-executable, but feature vocabularies can disclose training text: keep
bundles private and review their source data. Checksums detect inconsistent files;
they do not prove that externally supplied training or evaluation claims are true.

## Classifier files

`category_model.json`, `department_model.json`, and `priority_model.json` each contain
these exact top-level keys:

| Key | Contract |
| --- | --- |
| `schema_version` | `1` |
| `task` | `category`, `department`, or `priority`, matching the filename |
| `model_version` | Same nonempty value as metadata, at most 50 characters |
| `model_type` | `tfidf_centroid_v1` |
| `idf` | Object mapping 1–50,000 unigram/bigram strings to finite positive IDF weights, maximum 1,000,000 |
| `centroids` | Object mapping 1–100 class IDs to nonempty feature/weight objects; features must exist in `idf`; weights finite 0–1,000,000; each vector must have nonzero norm |
| `minimum_score` | Finite 0.05–1.0 acceptance threshold, chosen and evaluated by the model supplier |

Tokenization exactly matches `ml.baseline.features`: Unicode case-folding,
word tokens of at least two characters, then adjacent word bigrams. Input TF is
`1 + log(count)`, multiplied by stored IDF and normalized to unit length. Centroids
are normalized on load. The largest cosine score wins; class-ID lexical order
breaks ties. Scores are similarities, never calibrated probabilities.

Category and priority input is `title + ' ' + description`. Department fallback
input is `selected_or_suggested_category + ' ' + title + ' ' + description`.
Supplier training/export preprocessing must match these contracts.

`label_mapping.json` has exactly `schema_version: 1` and three objects named
`category`, `department`, and `priority`. Each maps the corresponding classifier's
class IDs to nonblank display labels, at most 200 characters. The class IDs must
match that model's centroids exactly. Priority labels must be `low`, `medium`,
`high`, or `critical`. Department labels resolve only to active database departments.

## Duplicate text model

`duplicate_model.json` contains the same keys as a classifier except `centroids`:
`schema_version`, `task: 'duplicate'`, `model_version`,
`model_type: 'tfidf_pair_cosine_v1'`, `idf`, and `minimum_score`.
It computes cosine between two vectors using a learned vocabulary/IDF. It supplies
text evidence for duplicate suggestions; existing category discounts, address
handling, geographic bounds, recent-candidate window, and access scope still apply.
It never automatically links or deletes reports. A score below its acceptance
threshold uses the existing local duplicate calculation.

## Metadata and held-out metrics

`model_metadata.json` must contain:

- `schema_version: 1`, `format: 'nagriksetu-json-tfidf-v1'`.
- `model_version`, `dataset_version` (nonblank, at most 200 characters),
  `dataset_sha256` (64 lowercase hexadecimal characters).
- `training_rows` (positive integer), `training_split: 'train'`.
- `artifacts`: exactly six entries, one for each other filename above, mapping to
  the SHA-256 digest of that file's exact bytes. Metadata is written last.

Additional provenance such as creation time, labeling review and limitations may
be kept in metadata. Never put credentials or personal records there.

`metrics.json` uses the existing `ml.evaluate` report structure. It must have
`measured: true`, `split: 'validation'` or `'test'`, matching `model_version`,
`dataset_version`, and `dataset_sha256`, and `classification.category`,
`classification.department`, `classification.priority`, each with positive integer
`samples` and finite `accuracy`/`macro_f1` in 0–1. Keep full per-label and duplicate
evaluation details from actual held-out evaluation. A duplicate sample count of
zero is an explicitly unevaluated duplicate task, not proof of performance. No
metrics are generated or invented by the serving loader.

The existing combined JSON file emitted by `ml.train` remains an offline research
artifact. An external training/export step must split its task centroids and IDF
into this serving contract, add reviewed thresholds and matching measured metrics,
and write byte checksums. This pass adds no production training or automatic export.

## Validate, activate, roll back

From `backend`, using a versioned private directory:

```powershell
.\.venv\Scripts\python.exe -m ml.validate_artifacts --directory .\ml\artifacts\reviewed-v1
$env:ML_ARTIFACT_DIR = 'ml/artifacts/reviewed-v1'
$env:ENABLE_TRAINED_ML = 'true'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Relative artifact paths resolve against `backend`; absolute operator paths are
also accepted. Default directory is `backend/ml/artifacts`, default enable flag is
false. Install a complete immutable version, validate it, then update the path and
restart the service. To roll back, set `ENABLE_TRAINED_ML=false` and restart.

Each task falls back when its input has no known features or its score is below
threshold. Existing priority phrase rules take precedence, including emergency
signals. An exact selected category/active-department match takes precedence over
learned routing. API response fields and role boundaries remain compatible; task
reasons identify trained predictions and scores. Missing or rejected artifacts
never block complaint submission. Human routing and verification remain authoritative.
