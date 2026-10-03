"""Individual citizen reports remain intact while staff share incident workflow."""
import unittest

from pydantic import ValidationError
from sqlalchemy import select, func

import test_backend as legacy
from app.db.database import SessionLocal
from app.models.complaint import Complaint
from app.models.domain import ComplaintEvidence, Incident
from app.schemas.complaint import ComplaintCreate
from app.services.intelligence import distance_km


class IncidentWorkflowTests(unittest.TestCase):
    setUp = legacy.BackendTests.setUp
    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login

    def report(self, headers, address="Main Road bus stop", latitude=22.0, longitude=77.0):
        return self.client.post("/api/v1/complaints", headers=headers, json={
            "title": "Large pothole beside the Main Road bus stop",
            "description": "A deep road pothole is damaging vehicles beside the Main Road bus stop.",
            "category": "Roads & Infrastructure", "latitude": latitude, "longitude": longitude,
            "location_accuracy_m": 8.5, "location_text": address, "locality": "Central",
            "area": "Market", "ward": "Ward 4",
        })

    def two_reports(self):
        first = self.report(self.ch)
        self.assertEqual(first.status_code, 201, first.text)
        other = self.login("other@example.com")
        second = self.report(other, latitude=22.0005)
        self.assertEqual(second.status_code, 201, second.text)
        first_body, second_body = first.json(), second.json()
        self.assertNotEqual(first_body["incident_id"], second_body["incident_id"])
        self.assertTrue(second_body["same_incident_candidates"])
        self.assertEqual(second_body["same_incident_candidates"][0]["incident_id"], first_body["incident_id"])
        self.assertIn("within 200 m", second_body["same_incident_candidates"][0]["reason"])
        self.assertNotIn("complaint_id", second_body["same_incident_candidates"][0])
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Incident)), 2)
        linked = self.client.post(f"/api/v1/authority/complaints/{second_body['id']}/incident",
            headers=self.ah, json={"incident_id": first_body["incident_id"],
                                   "reason": "Matching road damage and nearby coordinates confirmed by staff."})
        self.assertEqual(linked.status_code, 200, linked.text)
        return first_body, linked.json(), other

    def test_optional_location_validation_and_haversine(self):
        valid = {"title": "Report", "description": "A civic issue", "category": "Other"}
        self.assertIsNone(ComplaintCreate(**valid).latitude)
        self.assertEqual(ComplaintCreate(**valid, location_text=" Main Road ").address, "Main Road")
        self.assertEqual(ComplaintCreate(**valid, latitude=0, longitude=0).latitude, 0)
        self.assertAlmostEqual(distance_km(0, 0, 0, 1), 111.195, places=2)
        for coords in ({"latitude": 0}, {"longitude": 0}, {"latitude": 91, "longitude": 0},
                       {"latitude": float("nan"), "longitude": 0}):
            with self.subTest(coords=coords), self.assertRaises(ValidationError):
                ComplaintCreate(**valid, **coords)

    def test_reports_are_preserved_candidates_explained_and_incident_resolves_after_all_reporters(self):
        first, second, other = self.two_reports()
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Complaint)), 2)
            self.assertEqual(db.scalar(select(func.count()).select_from(Incident)), 1)
            self.assertNotEqual(db.get(Complaint, first["id"]).citizen_id,
                                db.get(Complaint, second["id"]).citizen_id)

        authority_id = self.client.get("/api/v1/auth/me", headers=self.oh).json()["id"]
        assigned = self.client.patch(f"/api/v1/authority/complaints/{first['id']}/assign",
            headers=self.ah, json={"assigned_department_id": 1, "assigned_officer_id": authority_id})
        self.assertEqual(assigned.status_code, 200, assigned.text)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{second['id']}", headers=other).json()["status"], "assigned")
        in_area = self.client.get("/api/v1/authority/complaints?area=Market", headers=self.oh)
        self.assertEqual({row["id"] for row in in_area.json()}, {first["id"], second["id"]})
        progress = self.client.patch(f"/api/v1/authority/complaints/{first['id']}/status",
            headers=self.oh, json={"status": "in_progress"})
        self.assertEqual(progress.status_code, 200, progress.text)
        remark = self.client.post(f"/api/v1/authority/complaints/{first['id']}/remarks",
            headers=self.oh, json={"text":"Crew started work on the road."})
        self.assertEqual(remark.status_code, 201, remark.text)
        sibling_timeline = self.client.get(f"/api/v1/complaints/{second['id']}/timeline", headers=other).json()
        self.assertIn("Crew started work on the road.", [entry["remarks"] for entry in sibling_timeline])
        resolved = self.client.post(f"/api/v1/authority/complaints/{first['id']}/resolve",
            headers=self.oh, json={"resolution_notes": "Road surface repaired."})
        self.assertEqual(resolved.status_code, 200, resolved.text)

        first_verify = self.client.post(f"/api/v1/complaints/{first['id']}/verify",
            headers=self.ch, json={"resolved": True})
        self.assertEqual(first_verify.status_code, 200, first_verify.text)
        summary = self.client.get(f"/api/v1/complaints/{second['id']}/incident", headers=other)
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(summary.json()["status"], "verification_pending")
        self.assertEqual(summary.json()["report_count"], 2)
        self.assertEqual(summary.json()["approvals"], 1)
        self.assertNotIn("complaints", summary.json())

        second_verify = self.client.post(f"/api/v1/complaints/{second['id']}/verify",
            headers=other, json={"resolved": True})
        self.assertEqual(second_verify.status_code, 200, second_verify.text)
        final = self.client.get(f"/api/v1/complaints/{first['id']}/incident", headers=self.ch).json()
        self.assertEqual(final["status"], "resolved")
        self.assertEqual(final["approvals"], 2)
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Complaint)), 2)
            self.assertEqual(db.scalar(select(func.count()).select_from(Incident)), 1)

    def test_one_reporter_rejection_reopens_the_shared_incident(self):
        first, second, other = self.two_reports()
        officer_id = self.client.get("/api/v1/auth/me", headers=self.oh).json()["id"]
        self.client.patch(f"/api/v1/authority/complaints/{first['id']}/assign", headers=self.ah,
                          json={"assigned_department_id": 1, "assigned_officer_id": officer_id})
        self.client.patch(f"/api/v1/authority/complaints/{first['id']}/status", headers=self.oh,
                          json={"status": "in_progress"})
        response = self.client.post(f"/api/v1/authority/complaints/{first['id']}/resolve", headers=self.oh,
                                    json={"resolution_notes": "Repair attempted.",
                                          "evidence_url": "https://example.com/repair.jpg"})
        self.assertEqual(response.status_code, 200, response.text)
        with SessionLocal() as db:
            shared = db.scalars(select(ComplaintEvidence).order_by(ComplaintEvidence.complaint_id)).all()
            self.assertEqual([row.complaint_id for row in shared], [first["id"], second["id"]])
        rejected = self.client.post(f"/api/v1/complaints/{second['id']}/verify", headers=other,
                                    json={"resolved": False, "feedback": "Still damaged."})
        self.assertEqual(rejected.status_code, 200, rejected.text)
        incident = self.client.get(f"/api/v1/complaints/{first['id']}/incident", headers=self.ch).json()
        self.assertEqual(incident["status"], "reopened")
        self.assertEqual(incident["rejections"], 1)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{first['id']}", headers=self.ch).json()["status"], "reopened")