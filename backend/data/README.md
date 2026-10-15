# Local prototype NLP corpus

`category_examples.json` contains 33 hand-written English seed examples, three per
supported category. These are synthetic examples, not citizen data or a validated
training dataset. The service fits a TF-IDF vectorizer and compares category
centroids. Confidence is cosine similarity, not a calibrated probability.

No production accuracy is claimed. Coverage of regional languages, spelling,
negation, multiple issues and emergencies is limited. Replace/extend this corpus
with reviewed, consented, de-identified examples and evaluate against a separate
held-out dataset before production use. No network calls or model downloads occur.

Algorithm version `tfidf-seed-v2` also compares recent permitted complaint text
with cosine similarity. Category/address mismatches reduce scores; complete
coordinate pairs more than 2 km apart are excluded. Missing coordinates do not
imply zero distance. Returned scores and explanations are suggestions for human
review; there is no automatic merging or rejection.

`support_knowledge.json` holds local Help & Support FAQ rules. Complaint status
answers are fetched separately from the database with owner/staff authorization;
no private records are embedded in this knowledge file.
