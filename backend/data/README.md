# Local prototype NLP corpus

`category_examples.json` contains 33 hand-written English seed examples, three per
supported category. These are synthetic examples, not citizen data or a validated
training dataset. The service fits a TF-IDF vectorizer and compares category
centroids. Confidence is cosine similarity, not a calibrated probability.

No production accuracy is claimed. Coverage of regional languages, spelling,
negation, multiple issues and emergencies is limited. Replace/extend this corpus
with reviewed, consented, de-identified examples and evaluate against a separate
held-out dataset before production use. No network calls or model downloads occur.
