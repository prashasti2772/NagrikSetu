"""Local prototype: TF-IDF category centroids, cosine duplicates, priority rules."""
import json
import re
from datetime import timedelta
from functools import lru_cache
from collections import Counter, defaultdict
from math import asin, cos, isfinite, log, radians, sin, sqrt
from sqlalchemy import select
from app.core.config import settings, BACKEND_DIR
from app.core.workflow import scope
from app.models.complaint import Complaint, utc_now
from app.models.domain import Department, ComplaintSuggestion

MODEL_VERSION = "tfidf-seed-v2"
DUPLICATE_RADIUS_KM = 2.0
DUPLICATE_SIMILARITY_METHOD = (
    "Local TF-IDF cosine similarity, multiplied by 0.75 for different known categories and "
    "0.85 for dissimilar addresses when coordinates cannot be compared; complete "
    "coordinate pairs must be within 2 km. Scores are not probabilities."
)

# Free-form categories remain stored as entered; aliases only help suggestions.
CATEGORY_ALIASES = {
    "roads": "roads infrastructure", "road": "roads infrastructure",
    "roads and infrastructure": "roads infrastructure",
    "water": "water supply", "lighting": "street lighting",
    "street lights": "street lighting", "parks": "parks gardens",
    "parks and gardens": "parks gardens", "traffic": "traffic parking",
    "parking": "traffic parking", "traffic and parking": "traffic parking",
}
ENGLISH_STOP_WORDS = frozenset("""
a about above after again against all am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have
having he her here hers herself him himself his how i if in into is it its itself just me more most
my myself no nor not of off on once only or other our ours ourselves out over own same she should so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was we were what when where which while who whom why will with would you your
yours yourself yourselves
""".split())


def normalized_text(value):
    return " ".join(re.findall(r"[\w]+", (value or "").casefold()))


def category_key(value):
    key = normalized_text(value)
    return CATEGORY_ALIASES.get(key, key)

def tokens(value):
    return [token for token in re.findall(r"(?u)\b\w\w+\b", (value or "").lower())
            if token not in ENGLISH_STOP_WORDS]

def features(value):
    words = tokens(value)
    return words + [words[index] + " " + words[index + 1] for index in range(len(words) - 1)]

def tfidf_vectors(documents, max_features=None):
    counts = [Counter(features(document)) for document in documents]
    document_frequency = Counter(feature for row in counts for feature in row)
    if max_features is not None and len(document_frequency) > max_features:
        totals = Counter()
        for row in counts:
            totals.update(row)
        selected = set(sorted(totals, key=lambda feature: (-totals[feature], feature))[:max_features])
        document_frequency = Counter({feature: count for feature, count in document_frequency.items() if feature in selected})
    total_documents = len(documents)
    vectors = []
    for row in counts:
        weighted = {feature: (1 + log(count)) * (log((1 + total_documents) / (1 + document_frequency[feature])) + 1)
                    for feature, count in row.items() if feature in document_frequency}
        norm = sqrt(sum(weight * weight for weight in weighted.values()))
        vectors.append({feature: weight / norm for feature, weight in weighted.items()} if norm else {})
    return vectors

def cosine(left, right):
    if len(left) > len(right):
        left, right = right, left
    return sum(weight * right.get(feature, 0.0) for feature, weight in left.items())

@lru_cache(maxsize=1)
def category_model():
    rows = json.loads((BACKEND_DIR / "data/category_examples.json").read_text())
    vectors = tfidf_vectors([row["text"] for row in rows])
    categories = sorted({row["category"] for row in rows})
    centroids = {}
    for category in categories:
        members = [vectors[index] for index, row in enumerate(rows) if row["category"] == category]
        centroid = defaultdict(float)
        for member in members:
            for feature, weight in member.items():
                centroid[feature] += weight / len(members)
        centroids[category] = dict(centroid)
    return categories, centroids

def category_suggestion(title, description):
    categories, centroids = category_model()
    vector = tfidf_vectors([title + " " + description])[0]
    scores = {category: cosine(vector, centroids[category]) / sqrt(sum(weight * weight for weight in centroids[category].values()))
              if centroids[category] else 0.0 for category in categories}
    category = max(categories, key=scores.__getitem__)
    confidence = scores[category]
    if confidence < 0.08:
        category = "Other"
    overlap = [(feature, vector.get(feature, 0.0) * centroids[category].get(feature, 0.0))
               for feature in vector if vector.get(feature, 0.0) * centroids[category].get(feature, 0.0) > 0]
    keywords = [feature for feature, _ in sorted(overlap, key=lambda pair: (pair[1], pair[0]), reverse=True)[:5]]
    return {"category": category, "confidence": round(confidence, 4), "keywords": keywords,
            "confidence_method": "Local TF-IDF cosine similarity; not a calibrated probability"}

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
            return {"priority": priority, "signals": matches,
                    "reason": "Matched priority phrases: " + ", ".join(matches)}
    return {"priority": "medium", "signals": [],
            "reason": "Default medium priority; no configured priority phrases matched."}

def recommend_department(db, category):
    departments = db.scalars(select(Department).where(Department.is_active.is_(True)).order_by(Department.id)).all()
    # Prefer an exact department name before applying a free-form alias.
    department = next((d for d in departments if normalized_text(d.name) == normalized_text(category)), None)
    if department is None:
        department = next((d for d in departments if category_key(d.name) == category_key(category)), None)
    return {"id": department.id, "name": department.name} if department else None


def valid_coordinates(latitude, longitude):
    return (latitude is not None and longitude is not None
            and isfinite(latitude) and isfinite(longitude)
            and -90 <= latitude <= 90 and -180 <= longitude <= 180)


def distance_km(latitude, longitude, other_latitude, other_longitude):
    """Haversine distance; callers must supply both complete coordinate pairs."""
    lat1, lat2 = radians(latitude), radians(other_latitude)
    a = (sin((lat2 - lat1) / 2) ** 2
         + cos(lat1) * cos(lat2) * sin(radians(other_longitude - longitude) / 2) ** 2)
    return 6371.0088 * 2 * asin(sqrt(min(1.0, max(0.0, a))))


def duplicates(db, title, description, user, exclude_id=None, *, category=None,
               latitude=None, longitude=None, address=None):
    if user is None:
        return []
    now = utc_now()
    query = select(Complaint).where(
        Complaint.created_at >= now - timedelta(days=settings.duplicate_lookback_days),
        Complaint.created_at <= now,
    )
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
    texts = [title + " " + description] + [(c.title or "") + " " + (c.description or "") for c in candidates]
    vectors = tfidf_vectors(texts, max_features=20000)
    if not vectors[0]:
        return []
    results = []
    for complaint, candidate_vector in zip(candidates, vectors[1:]):
        text_score = cosine(vectors[0], candidate_vector)
        if text_score <= 0:
            continue
        score = min(1.0, max(0.0, float(text_score)))
        reasons = ["Similar title/description"]
        selected_category, existing_category = category_key(category), category_key(complaint.category)
        if selected_category not in {"", "other"} and existing_category not in {"", "other"}:
            if selected_category == existing_category:
                reasons.append("same category")
            else:
                score *= 0.75
                reasons.append("different categories reduce the score")

        if (valid_coordinates(latitude, longitude)
                and valid_coordinates(complaint.latitude, complaint.longitude)):
            distance = distance_km(latitude, longitude, complaint.latitude, complaint.longitude)
            if distance > DUPLICATE_RADIUS_KM:
                continue
            reasons.append(f"locations within {distance:.2f} km")
        else:
            # An address is a text hint, never a substitute for geographic distance.
            input_address = set(normalized_text(address).split())
            candidate_address = set(normalized_text(complaint.address).split())
            if input_address and candidate_address:
                overlap = len(input_address & candidate_address) / len(input_address | candidate_address)
                if overlap >= 0.5:
                    reasons.append("similar address text; distance unknown")
                else:
                    score *= 0.85
                    reasons.append("different address text reduces the score; distance unknown")
            else:
                reasons.append("location unconfirmed")
        if score >= settings.duplicate_threshold:
            results.append({"complaint_id": complaint.id, "similarity": round(score, 4),
                            "reason": "; ".join(reasons)})
    return sorted(results, key=lambda x: (-x["similarity"], x["complaint_id"]))[:10]


def analyze(db, title, description, user, *, category=None, latitude=None, longitude=None,
            address=None, exclude_id=None):
    suggestion = category_suggestion(title, description)
    priority = priority_suggestion(title, description)
    department = recommend_department(db, category or suggestion["category"])
    department_basis = category or suggestion["category"]
    department_reason = (f"Matched category '{department_basis}' to active department '{department['name']}'."
                        if department else f"No active department matches category '{department_basis}'.")
    return {"suggested_category": suggestion["category"], "confidence": suggestion["confidence"],
            "category_keywords": suggestion["keywords"], "confidence_method": suggestion["confidence_method"],
            "suggested_priority": priority["priority"], "priority_signals": priority["signals"],
            "priority_reason": priority["reason"], "suggested_department": department,
            "recommended_department": department,
            "possible_duplicates": duplicates(db, title, description, user, exclude_id=exclude_id, category=department_basis,
                latitude=latitude, longitude=longitude, address=address),
            "duplicate_similarity_method": DUPLICATE_SIMILARITY_METHOD,
            "reasons": {"category": suggestion["confidence_method"], "department": department_reason,
                        "priority": priority["reason"], "duplicates": DUPLICATE_SIMILARITY_METHOD},
            "model_version": MODEL_VERSION,
            "limitations": "Prototype English text suggestions; no validated accuracy or guaranteed emergency detection. Human review required."}

def save_suggestion(db, complaint):
    category = category_suggestion(complaint.title, complaint.description)
    priority = priority_suggestion(complaint.title, complaint.description)
    # Routing recommendation honors the selected category, not the inferred category.
    department = recommend_department(db, complaint.category)
    db.add(ComplaintSuggestion(complaint_id=complaint.id, suggested_category=category["category"],
           confidence=category["confidence"], suggested_priority=priority["priority"],
           recommended_department_id=department["id"] if department else None, model_version=MODEL_VERSION))
