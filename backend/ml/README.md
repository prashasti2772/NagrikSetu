# Offline civic data and ML preparation

This folder prepares the **next dedicated training phase**. It is separate from
`app/services/intelligence.py`: the running API keeps its existing local TF-IDF,
priority rules, routing and incident matching. These tools do not load their output
into the app, download data/models, contact providers, or claim a production model.
Only synthetic fixtures are trained during tests.

## Dataset contract

Use UTF-8 JSONL: one object per line. The machine-readable schema is
[dataset.schema.json](dataset.schema.json); `schema.py` also checks complete coordinate
pairs, unique IDs, valid pair references and conflicting labels. Unknown fields,
nonfinite/out-of-range coordinates, blank labels and invalid enum values fail.
Errors identify the row number without printing its content.

| Field | Contract |
| --- | --- |
| `record_id` | Required pseudonymous stable ID, 1-100 letters/digits/underscore/period/colon/hyphen; never a citizen ID/email/phone |
| `complaint_text` | Required reviewed, de-identified text, 1-10,000 characters |
| `category` | Required reviewed category label, 1-200 characters |
| `department` | Required reviewed department routing label, 1-200 characters |
| `priority` | Required `low`, `medium`, `high`, or `critical`; human label |
| `latitude`, `longitude` | Optional/null pair; finite, -90..90 and -180..180; retain/coarsen only with approved purpose |
| `incident_group_id` | Optional pseudonymous real-incident group label; use the same ID for reports of one event |
| `duplicate_pairs` | Optional array of `{"other_id":"sample-02","is_duplicate":true}`; references another row in the same dataset; false is an explicitly reviewed negative label |
| `source` | Required nonsensitive provenance/version label, 1-200 characters; not copied citizen contact data |
| `language` | Required language tag, for example `en`, `hi`, `hi-IN`; no claim of multilingual model accuracy |
| `split` | `unassigned` (default), `train`, `validation`, or `test` |

A synthetic schema example (add a second referenced row before using pair labels):

```json
{"record_id":"synthetic-01","complaint_text":"A pothole appears near a public bus stop.","category":"Roads & Infrastructure","department":"Roads & Infrastructure","priority":"medium","latitude":null,"longitude":null,"incident_group_id":"synthetic-incident-01","duplicate_pairs":[],"source":"handwritten-synthetic-example-v1","language":"en","split":"unassigned"}
```

No automatic redaction utility can establish safe consent or remove all identities.
Before ingestion, review names, contact details, exact home locations, credentials,
images/EXIF, and sensitive free text. Never add Aadhaar/KYC documents, raw personal
records, provider secrets or application database exports. Source/license, consent,
label-review procedure and retention approval belong in the dataset's external
provenance record. A pseudonymous ID is not proof that text is de-identified.

## Preparation and leakage controls

`deduplicate` merges only normalized text rows whose labels, location, incident ID,
source, language and existing split all agree. It retains an alias map for every
original ID and remaps/merges pair labels. A positive pair collapsed to one canonical
row is represented by its aliases instead of an invalid self-pair. Different incident IDs or conflicting
labels preserve separate reports; contradictory pair evidence fails explicitly.
This offline cleanup never deletes or consolidates live citizen complaints.

Splitting keeps complete incident groups, both endpoints of every positive **and
negative** labelled pair, and repeated normalized text in one connected component.
This conservative rule prevents group/pair and exact-text leakage. A hash of stable
component IDs and a seed orders groups deterministically, independent of input order.
Default group proportions are approximately 70%/15%/15%; row ratios can differ when
groups vary in size. At least three independent components are required, and every
split gets at least one. Large interconnected negative-pair graphs can prevent a
useful split: redesign label sampling instead of splitting their endpoints apart.

Prepare once, version/freeze the split, and use validation for tuning. Do not keep
re-splitting to improve test scores. No label stratification, temporal generalization,
regional fairness, calibration, or production representativeness is implied.

## Commands (from backend)

Use your existing virtual environment and reviewed data outside tracked source.
The following commands do not download or generate a dataset. Create a private
artifact directory first. Paths are examples and contain no credentials.

```powershell
New-Item -ItemType Directory -Force .\ml\artifacts | Out-Null
.\.venv\Scripts\python.exe -m ml.prepare --input .\ml\datasets\reviewed-v1.jsonl --output .\ml\artifacts\prepared-v1.jsonl --manifest .\ml\artifacts\prepared-v1-manifest.json --seed reviewed-v1
.\.venv\Scripts\python.exe -m ml.train --dataset .\ml\artifacts\prepared-v1.jsonl --output .\ml\artifacts\baseline-v1.json --dataset-version reviewed-v1 --model-version baseline-v1
.\.venv\Scripts\python.exe -m ml.evaluate --dataset .\ml\artifacts\prepared-v1.jsonl --model .\ml\artifacts\baseline-v1.json --split validation --output .\ml\artifacts\validation-v1.json
.\.venv\Scripts\python.exe -m ml.evaluate --dataset .\ml\artifacts\prepared-v1.jsonl --model .\ml\artifacts\baseline-v1.json --split test --output .\ml\artifacts\test-v1.json
```

Outputs use exclusive creation; existing files are not overwritten. Preparation
outputs prepared JSONL and a manifest (input/prepared counts, split counts, seed,
SHA-256 dataset digest and ID aliases). Aliases and source data remain private.
`ml/.gitignore` excludes local JSONL, `datasets/`, and `artifacts/`.

## Baseline and metrics

Training fits a standard-library TF-IDF unigram/bigram vocabulary and normalized
label centroids using the **train split only** for category, department and priority.
Unseen text falls back to `Other`, no department, and `medium`; these are suggestions.
The existing online priority safety rules remain unchanged. Offline duplicate
scoring uses trained text cosine, a documented category mismatch discount and
Haversine distance when available, with fixed 0.65 threshold and 2 km radius.
These baseline heuristics have not been calibrated or tuned for production.

JSON model metadata includes caller-supplied dataset/model versions, algorithm
version, UTC creation time, actual training-row count, dataset SHA-256, score meaning
and fallbacks. Vocabulary terms can reveal training text: keep artifacts private
and ingest reviewed data only. There is no pickle loading or automatic deployment.

Evaluation checks the exact prepared dataset digest and rejects cross-split group
leakage or train-split evaluation. The JSON report contains `measured=true`, dataset
and model versions, split, category/department/priority sample counts, accuracy,
macro-F1 and per-label precision/recall/F1/support. Duplicate metrics count only
explicitly labelled pairs, once per unordered pair, and report TP/FP/FN/TN,
precision/recall/F1 and the threshold. No duplicate labels means sample count 0 and
null precision/recall/F1, not invented scores. Metrics are calculated from the supplied
held-out records and describe only those records. No trained artifacts or metric
results are committed as evidence of production performance.

## Next dedicated data/training phase

1. Identify official municipal/open-government civic grievance datasets or credible
   research/public-service datasets with documented licensing and permitted reuse.
   Add only specific reviewed sources; do not scrape arbitrary websites or label
   invented examples as official data.
2. Obtain required consent/approval, remove personal identities, review retained
   geography, and document provenance, dates, language/region coverage and retention.
3. Define category/department/priority rubrics and double-review same-incident pairs.
   Preserve individual report IDs and incident groups. Document disagreements.
4. Version the reviewed dataset and frozen group-aware split. Evaluate small baselines
   first, inspect errors by category/language/region, and record limitations and class
   imbalance before considering a stronger model.
5. Compare candidate artifacts on held-out data, retain human review/fallback rules,
   and add a separately reviewed serving integration only after acceptance criteria
   exist. No provider key, GPU or paid model is required for this preparation pass.
