"""Demo seeding is explicit, local-only, repeatable, and preserves existing data."""

import contextlib
import io
import os
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import test_backend as legacy  # Establish safe temporary development settings.
from sqlalchemy import func, inspect, select
from sqlalchemy.orm import Session

from app.core.security import password_hasher
from app.db.database import build_engine
from app.db.initialize import DEPARTMENTS, initialize_database
from app.models.complaint import Complaint, ComplaintStatus
from app.models.domain import ComplaintStatusHistory, ComplaintSuggestion, Department, Incident, Notification, User
from app.seed_dev import DEMO_USERS, main, seed_demo


class DemoSeedTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.engine = build_engine('sqlite:///' + self.folder.name + '/demo.db')
        self.password = 'test-only-demo-password-934!'

    def tearDown(self):
        self.engine.dispose()
        self.folder.cleanup()

    def test_new_seed_has_departments_accounts_assigned_samples_and_history(self):
        result = seed_demo(self.engine, self.password)
        self.assertEqual(result, {'users_created':5, 'complaints_created':3})
        self.assertNotIn(self.password, repr(result))
        with Session(self.engine) as db:
            self.assertEqual(set(db.scalars(select(Department.name))), set(DEPARTMENTS))
            users = db.scalars(select(User)).all()
            self.assertEqual(len(users), 5)
            self.assertEqual(sorted(user.role for user in users), ['admin', 'authority', 'authority', 'authority', 'citizen'])
            self.assertTrue(all(password_hasher.verify(self.password, user.password_hash) for user in users))
            samples = db.scalars(select(Complaint)).all()
            self.assertEqual(len(samples), 3)
            self.assertEqual(len({sample.incident_id for sample in samples}), 3)
            self.assertEqual(db.scalar(select(func.count()).select_from(Incident)), 3)
            for sample in samples:
                self.assertTrue(sample.title.startswith('[SAMPLE]'))
                self.assertTrue(sample.description.startswith('SAMPLE DATA ONLY:'))
                self.assertEqual(sample.status, ComplaintStatus.assigned)
                officer = db.get(User, sample.assigned_officer_id)
                self.assertEqual(officer.role, 'authority')
                self.assertEqual(officer.department_id, sample.assigned_department_id)
                self.assertEqual(db.get(User, sample.citizen_id).role, 'citizen')
            history = db.scalars(select(ComplaintStatusHistory).order_by(ComplaintStatusHistory.id)).all()
            self.assertEqual(len(history), 6)
            self.assertEqual([item.new_status for item in history], ['submitted', 'assigned'] * 3)
            self.assertEqual(db.scalar(select(func.count()).select_from(ComplaintSuggestion)), 3)
            self.assertEqual(db.scalar(select(func.count()).select_from(Notification)), 9)

    def test_second_run_preserves_passwords_and_modified_sample_workflow(self):
        seed_demo(self.engine, self.password)
        with Session(self.engine) as db:
            old_hashes = {user.id:user.password_hash for user in db.scalars(select(User))}
            sample = db.scalar(select(Complaint).order_by(Complaint.id))
            sample.title = 'Modified demo report during frontend testing'
            sample.status = ComplaintStatus.in_progress
            sample_id = sample.id
            db.commit()
        result = seed_demo(self.engine, 'a-different-test-password-482!')
        self.assertEqual(result, {'users_created':0, 'complaints_created':0})
        with Session(self.engine) as db:
            self.assertEqual({user.id:user.password_hash for user in db.scalars(select(User))}, old_hashes)
            self.assertEqual(db.get(Complaint, sample_id).status, ComplaintStatus.in_progress)
            self.assertEqual(db.get(Complaint, sample_id).title, 'Modified demo report during frontend testing')
            self.assertEqual(db.scalar(select(func.count()).select_from(Complaint)), 3)
            self.assertEqual(db.scalar(select(func.count()).select_from(ComplaintStatusHistory)), 6)
            self.assertEqual(db.scalar(select(func.count()).select_from(Notification)), 9)

    def test_refuses_production_non_sqlite_and_invalid_password_before_database_changes(self):
        for environment in ['production', 'staging', '']:
            with self.subTest(environment=environment), self.assertRaises(ValueError):
                seed_demo(self.engine, self.password, app_env=environment)
        postgres = SimpleNamespace(dialect=SimpleNamespace(name='postgresql'))
        with self.assertRaisesRegex(ValueError, 'SQLite'):
            seed_demo(postgres, self.password)
        for password in ['', 'short', 'x'*129, None, ' '*10]:
            with self.subTest(length=None if password is None else len(password)), self.assertRaises(ValueError) as caught:
                seed_demo(self.engine, password)
            if password:
                self.assertNotIn(password, str(caught.exception))
        self.assertEqual(inspect(self.engine).get_table_names(), [])

    def test_conflicting_reserved_identity_aborts_without_changing_any_account(self):
        initialize_database(self.engine)
        with Session(self.engine) as db:
            existing = User(email='DEMO.ADMIN@EXAMPLE.COM', full_name='Existing Citizen',
                            role='citizen', password_hash='existing-hash')
            db.add(existing)
            db.commit()
        with self.assertRaisesRegex(ValueError, 'conflicting role or profile'):
            seed_demo(self.engine, self.password)
        with Session(self.engine) as db:
            users = db.scalars(select(User)).all()
            self.assertEqual(len(users), 1)
            self.assertEqual((users[0].role, users[0].password_hash), ('citizen', 'existing-hash'))
            self.assertEqual(db.scalar(select(func.count()).select_from(Complaint)), 0)

    def test_matching_identity_is_preserved_but_disabled_department_aborts(self):
        initialize_database(self.engine)
        with Session(self.engine) as db:
            existing = User(email=DEMO_USERS[0]['email'], full_name=DEMO_USERS[0]['full_name'],
                            role='admin', password_hash='existing-hash')
            db.add(existing)
            sanitation = db.scalar(select(Department).where(Department.name == 'Sanitation'))
            sanitation.is_active = False
            db.commit()
        with self.assertRaisesRegex(ValueError, 'inactive'):
            seed_demo(self.engine, self.password)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(User)), 1)
            self.assertEqual(db.scalar(select(User.password_hash)), 'existing-hash')
            db.scalar(select(Department).where(Department.name == 'Sanitation')).is_active = True
            db.commit()
        self.assertEqual(seed_demo(self.engine, self.password)['users_created'], 4)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(User.password_hash).where(User.email == DEMO_USERS[0]['email'])), 'existing-hash')

    def test_reserved_employee_identifier_cannot_be_reused(self):
        initialize_database(self.engine)
        with Session(self.engine) as db:
            db.add(User(email='existing@example.com', full_name='Existing Officer', role='authority',
                        employee_id='DEMO-ROADS', password_hash='existing-hash'))
            db.commit()
        with self.assertRaisesRegex(ValueError, 'employee identifier'):
            seed_demo(self.engine, self.password)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(User)), 1)

    def test_cli_requires_opt_in_and_never_outputs_password(self):
        stderr = io.StringIO()
        with patch('app.seed_dev.seed_demo') as seed, contextlib.redirect_stderr(stderr):
            with self.assertRaises(SystemExit):
                main([])
            seed.assert_not_called()
        self.assertIn('--yes', stderr.getvalue())
        stdout = io.StringIO()
        with patch.dict(os.environ, {'SEED_DEMO_PASSWORD':self.password}), \
                patch('app.db.database.engine', self.engine), \
                patch('app.seed_dev.getpass.getpass') as prompt, contextlib.redirect_stdout(stdout):
            main(['--yes'])
            prompt.assert_not_called()
        self.assertIn('5 accounts and 3 sample complaints', stdout.getvalue())
        self.assertNotIn(self.password, stdout.getvalue())
        self.assertNotIn('argon2', stdout.getvalue())


if __name__ == '__main__':
    unittest.main()
