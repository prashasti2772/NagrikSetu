import unittest
from unittest.mock import Mock, patch
from sqlalchemy import select, func
import test_backend as legacy
from app.core.rate_limit import limiter
from app.db.database import SessionLocal
from app.models.complaint import Complaint
from app.models.domain import ComplaintEvidence, ComplaintStatusHistory, Notification
from app.services.chat_context import drafts, DraftStore
from app.services.complaints import create_report
from app.services.gemini import get_gemini_service, sanitize_user_text


class ConversationTests(unittest.TestCase):
    register=legacy.BackendTests.register
    login=legacy.BackendTests.login
    create=legacy.BackendTests.create
    assign=legacy.BackendTests.assign

    def setUp(self):
        legacy.BackendTests.setUp(self)
        drafts.clear()
        legacy.app.dependency_overrides[get_gemini_service]=lambda:None

    def tearDown(self):
        drafts.clear()
        legacy.BackendTests.tearDown(self)

    def chat(self, payload, headers=None):
        return self.client.post("/api/v1/chatbot/message",headers=headers or self.ch,json=payload)

    def draft(self, **extra):
        result=self.chat({"message":"Road par pothole hai",**extra})
        self.assertEqual(result.status_code,200,result.text)
        return result.json()

    def confirm(self, prepared, **extra):
        return self.chat({"message":"Confirm","action":"confirm","confirm":True,
            "draft_id":prepared["draft_id"],"draft_version":prepared["draft_version"],**extra})

    def count(self):
        with SessionLocal() as db:
            return db.scalar(select(func.count()).select_from(Complaint))

    def test_text_draft_has_structured_summary_and_does_not_create(self):
        result=self.draft()
        self.assertEqual(result["intent"],"complaint_draft")
        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(result["missing_fields"],[])
        self.assertEqual(result["suggested_category"],"Roads & Infrastructure")
        self.assertEqual(result["complaint_draft"]["description"],"Road par pothole hai")
        self.assertEqual(result["detected_language"],"hi-Latn")
        self.assertEqual(result["response_language"],"hi-Latn")
        self.assertFalse(result["translation_used"])
        self.assertEqual(self.count(),0)

    def test_confirm_calls_shared_creation_and_repeat_is_idempotent(self):
        draft=self.draft()
        with patch("app.services.conversation.create_report",wraps=create_report) as create:
            first=self.confirm(draft)
            second=self.confirm(draft)
        self.assertEqual(first.status_code,200,first.text)
        self.assertEqual(second.json()["complaint_id"],first.json()["complaint_id"])
        self.assertEqual(create.call_count,1)
        self.assertFalse(first.json()["requires_confirmation"])
        self.assertEqual(self.count(),1)
        self.assertTrue(first.json()["incident_id"])
        self.assertIn("upload_evidence",first.json()["suggested_actions"])
        with SessionLocal() as db:
            self.assertTrue(db.scalar(select(ComplaintStatusHistory.id).where(
                ComplaintStatusHistory.complaint_id==first.json()["complaint_id"])))
            self.assertTrue(db.scalar(select(Notification.id).where(
                Notification.complaint_id==first.json()["complaint_id"])))
        self.assertEqual(drafts.rows[draft["draft_id"]].values,{})

    def test_missing_information_must_be_completed_before_confirmation(self):
        response=self.chat({"message":"Which department will this complaint go to?"})
        self.assertEqual(response.json()["intent"],"complaint_analysis")
        initial=response.json()
        self.assertIn("description",initial["missing_fields"])
        self.assertTrue(self.confirm(initial).json()["requires_confirmation"])
        self.assertEqual(self.count(),0)
        updated=self.chat({"message":"Repair detail","action":"update_draft","draft_id":initial["draft_id"],
            "draft_version":initial["draft_version"],"draft":{"title":"Broken streetlight",
                "description":"The streetlight outside the public park is broken","location_text":"Public park"}}).json()
        self.assertEqual(updated["missing_fields"],[])
        result=self.confirm(updated)
        self.assertEqual(result.status_code,200,result.text)
        with SessionLocal() as db:
            row=db.get(Complaint,result.json()["complaint_id"])
            self.assertEqual(row.address,"Public park")
            self.assertIsNone(row.latitude)
            self.assertIsNone(row.longitude)

    def test_cancel_no_confirmation_and_inferred_submit_never_create(self):
        draft=self.draft()
        no=self.confirm(draft,confirm=False)
        self.assertTrue(no.json()["requires_confirmation"])
        inferred=self.chat({"message":"submit complaint","draft_id":draft["draft_id"],
                            "draft_version":draft["draft_version"]})
        self.assertTrue(inferred.json()["requires_confirmation"])
        self.assertEqual(self.count(),0)
        self.assertEqual(self.chat({"message":"Confirm","action":"confirm","confirm":True}).status_code,409)
        self.assertEqual(self.chat({"message":"Cancel","action":"cancel","draft_id":draft["draft_id"]}).status_code,200)
        self.assertEqual(self.confirm(draft).status_code,409)
        self.assertEqual(self.count(),0)

    def test_stale_version_or_mutation_during_confirmation_is_rejected(self):
        draft=self.draft()
        updated=self.chat({"message":"Update","action":"update_draft","draft_id":draft["draft_id"],
            "draft_version":draft["draft_version"],"draft":{"ward":"Ward 4"}}).json()
        self.assertEqual(updated["draft_version"],draft["draft_version"]+1)
        self.assertEqual(self.confirm(draft).status_code,409)
        self.assertEqual(self.confirm(updated,draft={"category":"Other"}).status_code,409)
        self.assertEqual(self.count(),0)
        self.assertEqual(self.confirm(updated).status_code,200)

    def test_anonymous_draft_needs_authenticated_review_and_staff_cannot_create(self):
        draft=self.client.post("/api/v1/chatbot/message",json={"message":"Road has a pothole"}).json()
        payload={"message":"Confirm","action":"confirm","confirm":True,
                 "draft_id":draft["draft_id"],"draft_version":draft["draft_version"]}
        self.assertEqual(self.client.post("/api/v1/chatbot/message",json=payload).status_code,401)
        self.assertEqual(self.chat(payload).status_code,404)
        for headers in (self.oh,self.ah):
            self.assertEqual(self.chat({"message":"Road has a pothole"},headers).status_code,403)
        self.assertEqual(self.count(),0)

    def test_context_owner_token_version_and_expiry_enforced(self):
        draft=self.draft()
        other=self.login("other@example.com")
        response=self.chat({"message":"Continue","draft_id":draft["draft_id"],
                            "draft_version":1},other)
        self.assertEqual(response.status_code,404)
        drafts.rows[draft["draft_id"]].token_version=-1
        self.assertEqual(self.confirm(draft).status_code,404)
        drafts.rows[draft["draft_id"]].expires=-1
        self.assertEqual(self.confirm(draft).status_code,409)
        self.assertEqual(self.count(),0)

    def test_ambiguous_status_returns_only_own_selection(self):
        first=self.create(self.ch)
        second=self.create(self.ch)
        other=self.create(self.login("other@example.com"))
        response=self.chat({"message":"Meri complaint ka status kya hai?"})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual(response.json()["topic"],"complaint_id_required")
        self.assertEqual({item["id"] for item in response.json()["selections"]},{first["id"],second["id"]})
        self.assertNotIn(other["id"],[item["id"] for item in response.json()["selections"]])
        self.assertIsNone(response.json()["complaint"])

    def test_status_incident_timeline_department_are_scoped_and_never_sent_to_gemini(self):
        report=self.create(self.ch); self.assign(report["id"])
        provider=Mock()
        legacy.app.dependency_overrides[get_gemini_service]=lambda:provider
        response=self.chat({"message":"Incident status","complaint_id":report["id"]})
        self.assertEqual(response.status_code,200,response.text)
        result=response.json()
        self.assertEqual(result["intent"],"incident_status")
        self.assertEqual(result["status_summary"]["department"]["id"],1)
        self.assertEqual(result["status_summary"]["incident"]["id"],report["incident_id"])
        self.assertTrue(result["timeline_summary"])
        denied=self.chat({"message":"Status","complaint_id":report["id"]},self.login("other@example.com"))
        missing=self.chat({"message":"Status","complaint_id":2147483647},self.login("other@example.com"))
        self.assertEqual(denied.status_code,404)
        self.assertEqual(denied.json(),missing.json())
        provider.chat_reply.assert_not_called()
        provider.analyze_issue.assert_not_called()

    def test_full_location_fields_survive_confirm_and_denial_never_blocks(self):
        draft=self.draft(draft={"latitude":22,"longitude":77,"location_accuracy_m":8,
            "location_text":"Main Road","locality":"Central","area":"Market","ward":"Ward 4"})
        result=self.confirm(draft)
        self.assertEqual(result.status_code,200,result.text)
        with SessionLocal() as db:
            row=db.get(Complaint,result.json()["complaint_id"])
            self.assertEqual((row.latitude,row.longitude,row.location_accuracy_m),(22,77,8))
            self.assertEqual((row.address,row.locality,row.area,row.ward),("Main Road","Central","Market","Ward 4"))
        self.assertEqual(self.confirm(self.draft()).status_code,200)
        self.assertEqual(self.chat({"message":"Pothole","draft":{"latitude":22}}).status_code,422)

    def test_same_incident_suggestions_preserve_new_report_without_private_ids(self):
        existing=self.create(self.login("other@example.com"))
        draft=self.draft(draft={"title":"Broken road","description":"Please repair","category":"Roads",
                               "latitude":22,"longitude":77})
        self.assertTrue(draft["same_incident_candidates"])
        candidate=draft["same_incident_candidates"][0]
        self.assertEqual(candidate["incident_id"],existing["incident_id"])
        self.assertNotIn("complaint_id",candidate)
        self.assertFalse(candidate["linked"])
        self.assertEqual(draft["possible_duplicates"],[])
        created=self.confirm(draft).json()
        self.assertNotEqual(created["complaint_id"],existing["id"])
        self.assertNotEqual(created["incident_id"],existing["incident_id"])
        self.assertEqual(self.count(),2)

    def test_image_success_and_failure_both_have_reviewable_contract(self):
        image=b"\x89PNG\r\n\x1a\nfixture-content"
        provider=Mock()
        provider.analyze_issue.return_value={"title":"Possible road damage","description":"The road appears damaged.",
                                            "assistant_message":"Review the possible damage"}
        legacy.app.dependency_overrides[get_gemini_service]=lambda:provider
        success=self.client.post("/api/v1/chatbot/analyze",headers=self.ch,data={"requested_language":"hi"},
            files={"image":("test.png",image,"image/png")})
        self.assertEqual(success.status_code,200,success.text)
        result=success.json()
        self.assertEqual(result["provider_used"],"gemini")
        self.assertTrue(result["requires_confirmation"])
        self.assertEqual(set(result["draft_complaint"]),{"title","description"})
        self.assertTrue(result["complaint_draft"]["image_attached"])
        self.assertFalse(result["missing_fields"])
        self.assertEqual(self.count(),0)
        provider.analyze_issue.side_effect=RuntimeError("provider-private-detail")
        failure=self.client.post("/api/v1/chatbot/analyze",headers=self.ch,
            files={"image":("test.png",image,"image/png")})
        self.assertEqual(failure.status_code,200,failure.text)
        fallback=failure.json()
        self.assertIn("description",fallback["missing_fields"])
        self.assertEqual(fallback["provider_used"],"local")
        self.assertNotIn("provider-private-detail",failure.text)
        self.assertTrue(self.confirm(fallback).json()["requires_confirmation"])
        self.assertEqual(self.count(),0)

    def test_owned_evidence_reference_is_reused_without_arbitrary_fetch(self):
        original=self.create(self.ch)
        evidence=self.client.post(f"/api/v1/complaints/{original['id']}/evidence",headers=self.ch,
            json={"image_url":"https://example.com/photo.png"}).json()
        foreign=self.create(self.login("other@example.com"))
        other_evidence=self.client.post(f"/api/v1/complaints/{foreign['id']}/evidence",
            headers=self.login("other@example.com"),json={"image_url":"https://example.com/other.png"}).json()
        self.assertEqual(self.chat({"message":"Pothole","draft":{"evidence_id":other_evidence["id"]}}).status_code,404)
        with patch("urllib.request.urlopen",side_effect=AssertionError("No arbitrary evidence fetching")):
            draft=self.draft(draft={"evidence_id":evidence["id"]})
            result=self.confirm(draft)
        self.assertEqual(result.status_code,200,result.text)
        with SessionLocal() as db:
            copied=db.scalar(select(ComplaintEvidence).where(ComplaintEvidence.complaint_id==result.json()["complaint_id"]))
            self.assertEqual(copied.image_url,evidence["image_url"])
        unsafe=self.chat({"message":"Pothole","draft":{"image_url":"http://127.0.0.1/private"}})
        self.assertEqual(unsafe.status_code,422)
        self.assertNotIn("127.0.0.1",unsafe.text)

    def test_distinct_hinglish_intents_and_text_voice_fallback(self):
        for text,intent in [("Garbage ki complaint kaise karu?","faq"),
                            ("Ye complaint kis department me jayegi?","complaint_analysis"),
                            ("Mere area me same problem already report hui hai kya?","complaint_analysis"),
                            ("Location permission denied","location_help"),
                            ("Aadhaar verification","identity_help"),
                            ("hello","general_help")]:
            result=self.chat({"message":text})
            self.assertEqual(result.status_code,200,result.text)
            self.assertEqual(result.json()["intent"],intent)
        language=self.client.get("/api/v1/language/capabilities").json()
        self.assertFalse(language["enabled"])
        result=self.chat({"message":"???? ?? ????? ??","requested_language":"hi"})
        self.assertEqual(result.json()["response_language"],"hi")
        self.assertFalse(result.json()["translation_used"])

    def test_support_unknown_and_sensitive_malformed_input_are_safe(self):
        support=self.chat({"message":"Help and Support contact"})
        self.assertIn("nagriksetuprashasti@gmail.com",support.json()["message"])
        unknown=self.chat({"message":"Tell me about astronomy"})
        self.assertEqual(unknown.json()["intent"],"unknown")
        self.assertTrue(unknown.json()["suggested_actions"])
        for data in ({"message":"help","token":"private-fixture-not-a-real-token"},
                     {"message":"x"*2001},{"message":"Pothole","draft":{"role":"admin"}},
                     {"message":"Confirm","confirm":"true"},{"message":"Pothole","draft":{"latitude":float("inf")}}):
            if data.get("draft",{}).get("latitude")==float("inf"): continue
            result=self.chat(data)
            self.assertEqual(result.status_code,422,result.text)
            self.assertNotIn("private-fixture-not-a-real-token",result.text)
        self.assertEqual(support.headers["cache-control"],"no-store")

class DraftStoreTests(unittest.TestCase):
    def test_capacity_and_expiry_do_not_retain_unbounded_context(self):
        now=[10.]
        store=DraftStore(maximum=2,ttl=30,clock=lambda:now[0])
        first,_=store.add(None,{"description":"temporary"})
        store.add(None,{}); store.add(None,{})
        self.assertEqual(len(store.rows),2)
        self.assertNotIn(first,store.rows)
        now[0]=41.
        store.purge()
        self.assertEqual(len(store.rows),0)

    def test_common_provider_credentials_redacted_before_model_calls(self):
        text="sb_secret_test_fixture_only xkeysib-test_fixture_only api_key: fixturekey"
        cleaned=sanitize_user_text(text)
        self.assertNotIn("fixture",cleaned)

if __name__=="__main__":
    unittest.main()
