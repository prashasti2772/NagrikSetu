"""Local prototype: TF-IDF category centroids, cosine duplicates, priority rules."""
import json
import re
from datetime import timedelta
from functools import lru_cache
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select
from app.core.config import settings, BACKEND_DIR
from app.core.workflow import scope
from app.models.complaint import Complaint, utc_now
from app.models.domain import Department, ComplaintSuggestion

MODEL_VERSION = "tfidf-seed-v1"

@lru_cache(maxsize=1)
def category_model():
    rows = json.loads((BACKEND_DIR / "data/category_examples.json").read_text())
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    matrix = vectorizer.fit_transform([row["text"] for row in rows])
    categories = sorted({row["category"] for row in rows})
    centroids = np.vstack([np.asarray(matrix[[i for i, row in enumerate(rows) if row["category"] == c]].mean(axis=0)).ravel()
                           for c in categories])
    return vectorizer, categories, centroids

def category_suggestion(title, description):
    vectorizer, categories, centroids = category_model()
    vector = vectorizer.transform([title + " " + description])
    scores = cosine_similarity(vector, centroids)[0]
    index = int(np.argmax(scores))
    confidence = float(scores[index])
    category = categories[index] if confidence >= 0.08 else "Other"
    overlap = vector.toarray()[0] * centroids[index]
    terms = vectorizer.get_feature_names_out()
    keywords = [str(terms[i]) for i in np.argsort(overlap)[::-1][:5] if overlap[i] > 0]
    return {"category": category, "confidence": round(confidence, 4), "keywords": keywords,
            "confidence_method": "TF-IDF cosine similarity; not a calibrated probability"}

PRIORITY_SIGNALS = {
    "critical": ["live wire", "electrocution", "building collapse", "trapped", "gas leak", "on fire"],
    "high": ["injured", "dangerous", "flooding", "sewage overflow", "no drinking water", "accident"],
    "low": ["cosmetic", "paint faded", "minor scratch", "suggestion"],
}

def priority_suggestion(title, description):
    text = " ".join(re.findall(r"[a-z0-9]+", (title + " " + description).lower()))
    for priority, phrases in PRIORITY_SIGNALS.items():
        matches = [p for p in phrases if re.search(r"\b" + re.escape(p) + r"\b", text)]
        if matches:
            return {"priority": priority, "signals": matches}
    return {"priority": "medium", "signals": []}

def recommend_department(db, category):
    department = db.scalar(select(Department).where(Department.name == category, Department.is_active.is_(True)))
    return {"id": department.id, "name": department.name} if department else None

def duplicates(db, title, description, user, exclude_id=None):
    query = select(Complaint).where(Complaint.created_at >= utc_now() - timedelta(days=settings.duplicate_lookback_days))
    # Citizens only compare their reports; staff comparisons follow existing access scope.
    if user.role == "citizen":
        query = query.where(Complaint.citizen_id == user.id)
    else:
        query = query.where(scope(user))
    if exclude_id is not None:
        query = query.where(Complaint.id != exclude_id)
    candidates = db.scalars(query.order_by(Complaint.created_at.desc(), Complaint.id.desc()).limit(settings.duplicate_candidate_limit)).all()
    if not candidates:
        return []
    texts = [title + " " + description] + [c.title + " " + c.description for c in candidates]
    try:
        vectors = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=20000).fit_transform(texts)
    except ValueError:  # Text consisting entirely of stop words/punctuation.
        return []
    scores = cosine_similarity(vectors[0], vectors[1:])[0]
    results = [{"complaint_id": c.id, "similarity": round(float(score), 4)} for c, score in zip(candidates, scores)
               if score >= settings.duplicate_threshold]
    return sorted(results, key=lambda x: (-x["similarity"], x["complaint_id"]))[:10]

def analyze(db, title, description, user):
    category = category_suggestion(title, description)
    priority = priority_suggestion(title, description)
    return {"suggested_category": category["category"], "confidence": category["confidence"],
            "category_keywords": category["keywords"], "confidence_method": category["confidence_method"],
            "suggested_priority": priority["priority"], "priority_signals": priority["signals"],
            "recommended_department": recommend_department(db, category["category"]),
            "possible_duplicates": duplicates(db, title, description, user), "model_version": MODEL_VERSION,
            "limitations": "Prototype English text suggestions; no validated accuracy or guaranteed emergency detection. Human review required."}

def save_suggestion(db, complaint):
    category = category_suggestion(complaint.title, complaint.description)
    priority = priority_suggestion(complaint.title, complaint.description)
    # Routing recommendation honors the selected category, not the inferred category.
    department = recommend_department(db, complaint.category)
    db.add(ComplaintSuggestion(complaint_id=complaint.id, suggested_category=category["category"],
           confidence=category["confidence"], suggested_priority=priority["priority"],
           recommended_department_id=department["id"] if department else None, model_version=MODEL_VERSION))
