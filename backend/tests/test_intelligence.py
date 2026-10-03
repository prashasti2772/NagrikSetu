"""Intelligence suggestions stay local, explainable, scoped, and non-mutating."""

import unittest
from dataclasses import replace
from datetime import timedelta
from unittest.mock import patch

import test_backend as legacy  # Establish the suite's temporary SQLite settings first.
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import Base, build_engine
from app.models.complaint import Complaint, utc_now
from app.models.domain import Department, User
from app.schemas.phase3 import AnalyzeComplaint, ComplaintAnalysis
from app.services.intelligence import (
    analyze, category_suggestion, distance_km, duplicates, priority_suggestion,
    recommend_department, valid_coordinates,
)


class IntelligenceTests(unittest.TestCase):
    def setUp(self):
        self.engine = build_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.db.add_all([
            Department(id=1, name='Roads & Infrastructure'),
            Department(id=2, name='Sanitation'),
            Department(id=3, name='Other'),
        ])
        self.db.flush()
        users = [('citizen', None), ('citizen', None), ('authority', 1),
                 ('authority', 2), ('admin', None)]
        self.users = []
        for identifier, (role, department) in enumerate(users, 1):
            user = User(id=identifier, full_name='Test', email=f'{identifier}@example.com',
                        password_hash='fixture-only-unused', role=role, department_id=department)
            self.db.add(user)
            self.users.append(user)
        self.db.flush()
        self.citizen, self.other, self.officer, self.outsider, self.admin = self.users
        self.title = 'Pothole broken road'
        self.description = 'Damaged pavement dangerous potholes near the crossing'

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def complaint(self, **changes):
        values = dict(title=self.title, description=self.description, category='Roads',
                      latitude=22.0, longitude=77.0, address='Main Road Crossing',
                      citizen_id=self.citizen.id)
        values.update(changes)
        complaint = Complaint(**values)
        self.db.add(complaint)
        self.db.flush()
        return complaint

    def find(self, user=None, **kwargs):
        return duplicates(self.db, self.title, self.description, user or self.citizen, **kwargs)

    def test_complete_coordinates_include_nearby_and_exclude_distant_reports(self):
        near = self.complaint(latitude=22.001)
        self.complaint(latitude=25)
        found = self.find(latitude=22, longitude=77)
        self.assertEqual([entry['complaint_id'] for entry in found], [near.id])
        self.assertEqual(found[0]['similarity'], 1.0)
        self.assertIn('locations within 0.11 km', found[0]['reason'])
        self.assertAlmostEqual(distance_km(0, 0, 0, 1), 111.195, places=3)
        self.assertTrue(valid_coordinates(0, 0))
        self.assertFalse(valid_coordinates(None, 0))
        self.assertFalse(valid_coordinates(90, float('nan')))

    def test_missing_or_partial_coordinates_never_imply_zero_or_a_distance(self):
        report = self.complaint(latitude=25, longitude=78)
        for coordinates in [{}, {'latitude':22}, {'longitude':77}]:
            found = self.find(**coordinates)
            self.assertEqual([entry['complaint_id'] for entry in found], [report.id])
            self.assertIn('location unconfirmed', found[0]['reason'])
            self.assertNotIn('km', found[0]['reason'])
        # Zero is a legitimate coordinate, not a missing-value sentinel.
        self.assertEqual(self.find(latitude=0, longitude=0), [])

    def test_address_text_is_a_hint_when_geographic_distance_is_unknown(self):
        same = self.complaint()
        different = self.complaint(address='South Market Avenue')
        found = self.find(address='  MAIN road, crossing!  ')
        self.assertEqual([entry['complaint_id'] for entry in found], [same.id, different.id])
        self.assertEqual([entry['similarity'] for entry in found], [1.0, 0.85])
        self.assertIn('similar address text; distance unknown', found[0]['reason'])
        self.assertIn('different address text', found[1]['reason'])
        # Complete coordinates take precedence over spelling/address variations.
        found = self.find(address='An unrelated address', latitude=22, longitude=77)
        self.assertEqual([entry['similarity'] for entry in found], [1.0, 1.0])

    def test_category_aliases_and_mismatches_affect_suggestions_without_filtering_input(self):
        same = self.complaint(category='Roads & Infrastructure')
        different = self.complaint(category='Sanitation')
        found = self.find(category='  roads  ')
        self.assertEqual([entry['complaint_id'] for entry in found], [same.id, different.id])
        self.assertEqual([entry['similarity'] for entry in found], [1.0, 0.75])
        self.assertIn('same category', found[0]['reason'])
        self.assertIn('different categories', found[1]['reason'])
        for category in [None, 'Other']:
            self.assertEqual([entry['similarity'] for entry in self.find(category=category)], [1.0, 1.0])
        self.assertEqual(recommend_department(self.db, 'Roads')['id'], 1)
        self.db.get(Department, 1).is_active = False
        self.db.flush()
        self.assertIsNone(recommend_department(self.db, 'Roads'))

    def test_recent_matches_respect_exclusion_threshold_and_candidate_limit(self):
        old = utc_now() - timedelta(days=settings.duplicate_lookback_days + 1)
        self.complaint(created_at=old)
        self.complaint(created_at=utc_now() + timedelta(days=1))
        recent = self.complaint()
        newest = self.complaint()
        found = self.find(exclude_id=recent.id)
        self.assertEqual([entry['complaint_id'] for entry in found], [newest.id])
        with patch('app.services.intelligence.settings', replace(settings, duplicate_candidate_limit=1)):
            self.assertEqual([entry['complaint_id'] for entry in self.find()], [newest.id])
        with patch('app.services.intelligence.settings', replace(settings, duplicate_threshold=0.8)):
            self.assertEqual(self.find(category='Sanitation'), [])

    def test_duplicate_data_is_scoped_to_citizen_or_authority_permissions(self):
        owned = self.complaint(assigned_department_id=2)
        department_match = self.complaint(citizen_id=self.other.id, assigned_department_id=1)
        officer_match = self.complaint(citizen_id=self.other.id, assigned_officer_id=self.officer.id)
        private = self.complaint(citizen_id=self.other.id)
        self.assertEqual([entry['complaint_id'] for entry in self.find()], [owned.id])
        self.assertEqual({entry['complaint_id'] for entry in self.find(user=self.officer)},
                         {department_match.id, officer_match.id})
        self.assertEqual([entry['complaint_id'] for entry in self.find(user=self.outsider)], [owned.id])
        self.assertEqual({entry['complaint_id'] for entry in self.find(user=self.admin)},
                         {owned.id, department_match.id, officer_match.id, private.id})
        self.officer.department_id = None
        self.assertEqual([entry['complaint_id'] for entry in self.find(user=self.officer)], [officer_match.id])

    def test_unrelated_and_empty_vocabulary_never_match(self):
        self.complaint(title='Bird rescue', description='Injured sparrow on balcony')
        self.assertEqual(self.find(), [])
        self.db.query(Complaint).delete()
        self.complaint(title='the', description='and it')
        self.assertEqual(duplicates(self.db, 'the', 'and it', self.citizen), [])

    def test_analysis_is_non_mutating_and_respects_selected_department(self):
        existing = self.complaint(category='Sanitation', priority='low', severity='low')
        result = analyze(self.db, self.title, self.description, self.citizen,
                         category='Sanitation', latitude=22, longitude=77)
        ComplaintAnalysis.model_validate(result)
        self.assertEqual(result['suggested_category'], 'Roads & Infrastructure')
        self.assertEqual(result['suggested_department'], {'id':2, 'name':'Sanitation'})
        self.assertEqual(result['suggested_department'], result['recommended_department'])
        self.assertEqual(result['suggested_priority'], 'high')
        self.assertIn('dangerous', result['priority_reason'])
        self.assertEqual(set(result['reasons']), {'category','department','priority','duplicates'})
        self.assertIn('Sanitation', result['reasons']['department'])
        self.assertIn('not probabilities', result['duplicate_similarity_method'])
        self.db.refresh(existing)
        self.assertEqual((existing.category, existing.priority, existing.status.value),
                         ('Sanitation', 'low', 'submitted'))
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Complaint)), 1)
        self.assertIsNone(analyze(self.db, self.title, self.description, self.citizen,
                                 category='Unknown custom category')['suggested_department'])

    def test_priority_rules_have_precedence_word_boundaries_and_explanations(self):
        result = priority_suggestion('Cosmetic paint faded', 'Exposed LIVE-WIRE, dangerous accident')
        self.assertEqual(result['priority'], 'critical')
        self.assertEqual(result['signals'], ['live wire'])
        self.assertEqual(priority_suggestion('A note', 'accidentally dropped a notebook')['priority'], 'medium')
        self.assertEqual(priority_suggestion('Minor scratch', 'Paint faded')['priority'], 'low')
        unknown = category_suggestion('zzzz', 'qqqq')
        self.assertEqual((unknown['category'], unknown['confidence']), ('Other', 0))
        self.assertIn('not a calibrated probability', unknown['confidence_method'])

    def test_analysis_schema_accepts_optional_location_and_rejects_bad_inputs(self):
        base = {'title':self.title, 'description':self.description}
        self.assertIsNone(AnalyzeComplaint(**base).latitude)
        self.assertEqual(AnalyzeComplaint(**base, latitude=0).latitude, 0)
        self.assertEqual(AnalyzeComplaint(**base, category=' Roads ', address=' Main Road ').category, 'Roads')
        for invalid in [{'latitude':91}, {'longitude':181}, {'longitude':float('inf')},
                        {'latitude':float('nan')}, {'category':' '}, {'address':' '},
                        {'category':'x'*101}, {'address':'x'*501}, {'citizen_id':2}]:
            with self.subTest(invalid=invalid), self.assertRaises(ValidationError):
                AnalyzeComplaint(**base, **invalid)


class IntelligenceEndpointTests(unittest.TestCase):
    setUp = legacy.BackendTests.setUp
    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login

    def test_analysis_endpoint_contract_and_optional_inputs(self):
        route = '/api/v1/intelligence/analyze-complaint'
        payload = {'title':'Pothole broken road', 'description':'Damaged road pavement',
                   'category':'Roads', 'address':'Main Road', 'latitude':22}
        self.assertEqual(self.client.post(route, json=payload).status_code, 401)
        response = self.client.post(route, headers=self.ch, json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        ComplaintAnalysis.model_validate(body)
        self.assertEqual(body['suggested_department']['name'], 'Roads & Infrastructure')
        self.assertEqual(body['possible_duplicates'], [])
        self.assertEqual(self.client.get('/api/v1/users/me/complaints', headers=self.ch).json(), [])
        self.assertEqual(self.client.post(route, headers=self.ch,
                                         json={**payload, 'longitude':181}).status_code, 422)


if __name__ == '__main__':
    unittest.main()
