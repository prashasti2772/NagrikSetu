import os
import unittest
from datetime import timedelta
from unittest.mock import patch
from sqlalchemy import select
import test_backend as legacy
from app.db.database import SessionLocal
from app.models.complaint import Complaint, utc_now
from app.models.domain import IncidentVerificationRound, User, ComplaintStatusHistory

class VerificationPolicyTests(unittest.TestCase):
    setUp = legacy.BackendTests.setUp
    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login
    create = legacy.BackendTests.create
    assign = legacy.BackendTests.assign

    def group(self, count=2):
        headers = [self.ch, self.login("other@example.com")]
        if count == 3:
            self.register("third@example.com")
            headers.append(self.login("third@example.com"))
        reports = [self.create(header) for header in headers[:count]]
        for report in reports[1:]:
            response = self.client.post(f"/api/v1/authority/complaints/{report['id']}/incident",
                headers=self.ah, json={"incident_id":reports[0]["incident_id"], "reason":"Same issue confirmed"})
            self.assertEqual(response.status_code,200,response.text)
        self.assign(reports[0]["id"])
        return reports, headers[:count]

    def resolve(self, report, evidence=True):
        payload = {"resolution_notes":"Repair inspected by field officer"}
        if evidence:
            payload["evidence_url"] = "https://example.com/resolution.png"
        response = self.client.post(f"/api/v1/authority/complaints/{report['id']}/resolve",
                                   headers=self.oh,json=payload)
        self.assertEqual(response.status_code,200,response.text)

    def vote(self, report, headers, approved=True):
        return self.client.post(f"/api/v1/complaints/{report['id']}/verify",headers=headers,
                                json={"resolved":approved,"feedback":"Citizen inspection recorded"})

    def info(self, report):
        response=self.client.get(f"/api/v1/complaints/{report['id']}/incident",headers=self.ch)
        self.assertEqual(response.status_code,200,response.text)
        return response.json()

    def expire(self, incident_id):
        with SessionLocal() as db:
            row=db.scalar(select(IncidentVerificationRound).where(
                IncidentVerificationRound.incident_id==incident_id).order_by(IncidentVerificationRound.id.desc()))
            row.deadline=utc_now()-timedelta(seconds=1)
            db.commit()

    def test_quorum_closes_without_fabricating_nonresponse_and_late_rejection_reopens(self):
        reports,headers=self.group(3)
        self.resolve(reports[0])
        policy=self.info(reports[0])
        self.assertEqual(policy["verification_approvals_required"],2)
        self.assertEqual(policy["verification_window_hours"],72)
        self.assertEqual(self.vote(reports[0],headers[0]).status_code,200)
        self.assertEqual(self.info(reports[0])["status"],"verification_pending")
        self.assertEqual(self.vote(reports[1],headers[1]).status_code,200)
        summary=self.info(reports[0])
        self.assertEqual((summary["status"],summary["verification_outcome"]),("resolved","quorum"))
        third=self.client.get(f"/api/v1/complaints/{reports[2]['id']}",headers=headers[2]).json()
        self.assertEqual((third["status"],third["verification_status"]),("resolved","pending"))
        self.assertEqual(self.vote(reports[2],headers[2],False).status_code,200)
        summary=self.info(reports[0])
        self.assertEqual(summary["status"],"reopened")
        self.assertEqual(summary["verification_outcome"],"rejected_after_quorum")
        self.assertIsNotNone(summary["verification_reopened_at"])

    def test_inactive_reporter_does_not_block_quorum(self):
        reports,headers=self.group()
        with SessionLocal() as db:
            db.get(User,self.other["id"]).is_active=False
            db.commit()
        self.resolve(reports[0])
        self.assertEqual(self.info(reports[0])["verification_eligible_reporters"],1)
        self.assertEqual(self.vote(reports[0],headers[0]).status_code,200)
        self.assertEqual(self.info(reports[0])["status"],"resolved")

    def test_expiry_requires_explicit_staff_evidence_review_and_preserves_no_response(self):
        reports,headers=self.group()
        self.resolve(reports[0])
        route=f"/api/v1/authority/incidents/{reports[0]['incident_id']}/finalize-verification"
        payload={"reason":"Evidence reviewed after no response in the full window"}
        self.assertEqual(self.client.post(route,headers=self.oh,json=payload).status_code,409)
        self.expire(reports[0]["incident_id"])
        self.assertTrue(self.info(reports[0])["verification_review_required"])
        self.assertEqual(self.vote(reports[0],headers[0]).status_code,409)
        self.assertEqual(self.client.post(route,headers=self.ch,json=payload).status_code,403)
        self.assertEqual(self.client.post(route,headers=self.login("outsider@example.com"),json=payload).status_code,404)
        result=self.client.post(route,headers=self.oh,json=payload)
        self.assertEqual(result.status_code,200,result.text)
        self.assertEqual(result.json()["verification_outcome"],"staff_review")
        for report,header in zip(reports,headers):
            item=self.client.get(f"/api/v1/complaints/{report['id']}",headers=header).json()
            self.assertEqual(item["verification_status"],"pending")
            self.assertEqual(item["status"],"resolved")

    def test_staff_timeout_closure_requires_evidence_and_nonblank_reason(self):
        reports,_=self.group()
        self.resolve(reports[0],evidence=False)
        self.expire(reports[0]["incident_id"])
        route=f"/api/v1/authority/incidents/{reports[0]['incident_id']}/finalize-verification"
        self.assertEqual(self.client.post(route,headers=self.oh,json={"reason":"Reviewed"}).status_code,409)
        self.assertEqual(self.client.post(route,headers=self.oh,json={"reason":" "}).status_code,422)

    def test_citizen_can_request_reopen_after_closure_and_others_cannot(self):
        reports,headers=self.group()
        self.resolve(reports[0])
        self.vote(reports[0],headers[0]); self.vote(reports[1],headers[1])
        self.expire(reports[0]["incident_id"])
        route=f"/api/v1/complaints/{reports[0]['id']}/reopen-request"
        self.assertEqual(self.client.post(route,headers=headers[1],json={"reason":"Still broken"}).status_code,403)
        self.assertEqual(self.client.post(route,headers=self.oh,json={"reason":"Still broken"}).status_code,403)
        response=self.client.post(route,headers=headers[0],json={"reason":"Still broken after repair"})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()["status"],"reopened")
        with SessionLocal() as db:
            history=db.scalars(select(ComplaintStatusHistory).where(
                ComplaintStatusHistory.complaint_id==reports[0]["id"]).order_by(ComplaintStatusHistory.id)).all()
            self.assertEqual(history[-1].action,"citizen_reopen_requested")
            self.assertEqual(history[-1].remarks,"Still broken after repair")

    def test_policy_snapshot_and_new_round_preserve_previous_audit(self):
        reports,headers=self.group()
        with patch.dict(os.environ,{"VERIFICATION_WINDOW_HOURS":"24","VERIFICATION_QUORUM_PERCENT":"100"}):
            self.resolve(reports[0])
        policy=self.info(reports[0])
        self.assertEqual((policy["verification_window_hours"],policy["verification_quorum_percent"]),(24,100))
        self.vote(reports[0],headers[0],False)
        self.resolve(reports[0])
        with SessionLocal() as db:
            rounds=db.scalars(select(IncidentVerificationRound).where(
                IncidentVerificationRound.incident_id==reports[0]["incident_id"]).order_by(IncidentVerificationRound.id)).all()
            self.assertEqual(len(rounds),2)
            self.assertEqual(rounds[0].outcome,"rejected")
            self.assertEqual(rounds[0].window_hours,24)
            self.assertEqual(rounds[1].window_hours,72)

    def test_incident_detail_scopes_and_paginates_retained_reports(self):
        reports, _ = self.group(3)
        route = f"/api/v1/authority/incidents/{reports[0]['incident_id']}"
        self.assertEqual(self.client.get(route, headers=self.ch).status_code, 403)
        self.assertEqual(self.client.get(route, headers=self.login("outsider@example.com")).status_code, 404)
        first = self.client.get(route + "?limit=2", headers=self.oh)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["incident"]["report_count"], 3)
        self.assertEqual([row["id"] for row in first.json()["reports"]], [row["id"] for row in reports[:2]])
        second = self.client.get(route + "?offset=2&limit=2", headers=self.oh)
        self.assertEqual([row["id"] for row in second.json()["reports"]], [reports[2]["id"]])
        candidate = reports[1]["same_incident_candidates"][0]
        self.assertTrue(candidate["category_match"])
        self.assertFalse(candidate["linked"])
        self.assertEqual(candidate["text_similarity"], candidate["similarity"])
        self.assertNotIn("complaint_id", candidate)

    def test_reconsolidation_preserves_old_resolution_round_audit(self):
        reports, headers = self.group(1)
        original = reports[0]
        self.resolve(original)
        self.assertEqual(self.vote(original, headers[0], False).status_code, 200)
        target = self.create(self.login("other@example.com"))
        response = self.client.post(f"/api/v1/authority/complaints/{original['id']}/incident",
            headers=self.ah, json={"incident_id": target["incident_id"], "reason": "Corrected incident grouping after review"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["incident_id"], target["incident_id"])
        with SessionLocal() as db:
            old_round = db.scalar(select(IncidentVerificationRound).where(
                IncidentVerificationRound.incident_id == original["incident_id"]))
            self.assertIsNotNone(old_round)
            self.assertEqual(old_round.outcome, "rejected")
            self.assertEqual(db.get(Complaint, original["id"]).incident_id, target["incident_id"])
        ledger = self.client.get("/api/v1/authority/incidents", headers=self.ah).json()
        self.assertNotIn(original["incident_id"], [row["id"] for row in ledger])
        self.assertEqual(next(row["report_count"] for row in ledger if row["id"] == target["incident_id"]), 2)

    def test_duplicate_verification_does_not_count_twice(self):
        reports,headers=self.group(3)
        self.resolve(reports[0])
        self.assertEqual(self.vote(reports[0],headers[0]).status_code,200)
        self.assertEqual(self.vote(reports[0],headers[0]).status_code,409)
        self.assertEqual(self.info(reports[0])["approvals"],1)

if __name__=="__main__":
    unittest.main()
