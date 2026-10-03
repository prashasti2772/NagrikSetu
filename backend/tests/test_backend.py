import os
import tempfile
import unittest
from datetime import timedelta
from unittest.mock import patch

_temp = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + _temp.name + '/test.db'
os.environ['APP_ENV'] = 'development'
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from app.main import app
from app.db.database import engine, Base, SessionLocal, build_engine
from app.db.initialize import initialize_database
from app.core.config import Settings
from app.core.security import password_hasher
from app.models.domain import User, PasswordOTP, ComplaintRemark
from app.models.complaint import utc_now
from app.core.otp import get_otp_delivery

class Delivery:
    def send(self, email, otp):
        self.code = otp

class BackendTests(unittest.TestCase):
    def setUp(self):
        from app.core.rate_limit import limiter
        limiter.clear()
        Base.metadata.drop_all(engine)
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        self.delivery = Delivery()
        app.dependency_overrides[get_otp_delivery] = lambda: self.delivery
        self.client = TestClient(app)
        self.client.__enter__()
        self.password = 'local-test-password-392!'
        self.citizen = self.register('citizen@example.com')
        self.other = self.register('other@example.com')
        with SessionLocal() as db:
            for name, role, department in [('officer', 'authority', 1), ('outsider', 'authority', 2), ('admin', 'admin', None)]:
                db.add(User(full_name=name, email=name+'@example.com', role=role, department_id=department,
                            password_hash=password_hasher.hash(self.password)))
            db.commit()
        self.ch = self.login('citizen@example.com')
        self.oh = self.login('officer@example.com')
        self.ah = self.login('admin@example.com')

    def tearDown(self):
        self.client.__exit__(None, None, None)
        app.dependency_overrides.clear()

    def register(self, email):
        r = self.client.post('/api/v1/auth/register', json={'full_name': 'Test User', 'email': email, 'password': self.password})
        self.assertEqual(r.status_code, 201, r.text)
        self.assertNotIn('password_hash', r.json())
        return r.json()

    def login(self, email):
        r = self.client.post('/api/v1/auth/login', json={'email': email, 'password': self.password})
        self.assertEqual(r.status_code, 200, r.text)
        return {'Authorization': 'Bearer '+r.json()['access_token']}

    def create(self, headers=None):
        r = self.client.post('/api/v1/complaints', headers=headers or {}, json={
            'title': 'Broken road', 'description': 'Please repair', 'category': 'Roads',
            'latitude': 22, 'longitude': 77, 'address': 'Main Road'})
        self.assertEqual(r.status_code, 201, r.text)
        return r.json()

    def assign(self, cid):
        officer_id = self.client.get('/api/v1/auth/me', headers=self.oh).json()['id']
        r = self.client.patch(f'/api/v1/authority/complaints/{cid}/assign', headers=self.ah,
                             json={'assigned_department_id': 1, 'assigned_officer_id': officer_id, 'priority': 'high'})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()['status'], 'assigned')

    def test_health_legacy_and_auth(self):
        for url in ['/', '/health', '/health/db']:
            self.assertEqual(self.client.get(url).status_code, 200)
        payload = {'title': 'Broken road', 'description': 'Please repair', 'category': 'Roads',
                   'latitude': 22, 'longitude': 77, 'address': 'Main Road'}
        self.assertEqual(self.client.post('/api/v1/complaints', json=payload).status_code, 401)
        c = self.create(self.ch)
        self.assertEqual(c['citizen_id'], self.citizen['id'])
        self.assertEqual(self.client.get('/api/v1/complaints').status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{c['id']}").status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{c['id']}", headers=self.ch).status_code, 200)
        self.assertEqual(self.client.patch(f"/api/v1/complaints/{c['id']}/status", json={'status':'resolved'}).status_code, 401)
        self.assertEqual(self.client.get('/api/v1/auth/me', headers=self.ch).json()['role'], 'citizen')
        self.assertEqual(self.client.get('/api/v1/auth/me', headers={'Authorization':'Bearer bad'}).status_code, 401)
        self.assertEqual(self.client.post('/api/v1/auth/login', json={'email':'citizen@example.com','password':'wrong'}).status_code, 401)
        self.assertEqual(self.client.get(f"/api/v1/complaints/{c['id']}", headers=self.login('other@example.com')).status_code, 403)
        self.assertEqual(self.client.post('/api/v1/auth/register', json={'full_name':'X','email':'x@example.com','password':self.password,'role':'admin'}).status_code, 422)
        self.assertEqual(self.client.post('/api/v1/auth/register', json={'full_name':'X','email':'CITIZEN@example.com','password':self.password}).status_code, 409)
        self.assertEqual(self.client.get('/api/v1/authority/dashboard', headers=self.ch).status_code, 403)
        self.assertEqual(self.client.post('/api/v1/admin/departments', headers=self.oh, json={'name':'Unauthorized'}).status_code, 403)
        self.assertEqual(len(self.client.get('/api/v1/departments').json()), 11)
        d = self.client.post('/api/v1/admin/departments', headers=self.ah, json={'name':'New Department'})
        self.assertEqual(d.status_code, 201)
        self.assertEqual(self.client.patch('/api/v1/admin/departments/'+str(d.json()['id']),headers=self.ah,json={'is_active':False}).status_code, 200)
        managed = self.client.get('/api/v1/admin/departments?is_active=false',headers=self.ah)
        self.assertEqual(managed.status_code,200,managed.text)
        self.assertEqual([item['id'] for item in managed.json()],[d.json()['id']])
        self.assertEqual(self.client.get('/api/v1/admin/departments',headers=self.ch).status_code,403)
        self.assertNotIn(d.json()['id'],[item['id'] for item in self.client.get('/api/v1/departments').json()])

    def test_full_workflow_and_permissions(self):
        c = self.create(self.ch)
        cid = c['id']
        base = f'/api/v1/authority/complaints/{cid}'
        self.assertEqual(c['citizen_id'], self.citizen['id'])
        self.assertEqual(self.client.get('/api/v1/users/me/dashboard',headers=self.ch).json()['total'], 1)
        self.assertEqual(len(self.client.get('/api/v1/users/me/complaints',headers=self.ch).json()), 1)
        other = self.login('other@example.com')
        self.assertEqual(self.client.get('/api/v1/users/me/complaints',headers=other).json(), [])
        self.assertEqual(self.client.get(base,headers=self.oh).status_code, 403)
        self.assign(cid)
        self.assertEqual(self.client.get(base,headers=self.oh).status_code, 200)
        outsider = self.login('outsider@example.com')
        self.assertEqual(self.client.get(base,headers=outsider).status_code, 403)
        officers = self.client.get('/api/v1/authority/officers',headers=self.oh)
        self.assertEqual([officer['id'] for officer in officers.json()], [self.client.get('/api/v1/auth/me',headers=self.oh).json()['id']])
        self.assertEqual(self.client.get('/api/v1/authority/officers?department=2',headers=self.oh).status_code,403)
        self.assertEqual(self.client.get('/api/v1/authority/officers',headers=self.ch).status_code,403)
        self.assertEqual(self.client.get('/api/v1/authority/complaints',headers=outsider).json(), [])
        self.assertEqual(len(self.client.get('/api/v1/authority/complaints?priority=high&location=Main&department=1',headers=self.oh).json()), 1)
        officer_id = self.client.get('/api/v1/auth/me',headers=self.oh).json()['id']
        self.assertEqual(len(self.client.get(f'/api/v1/authority/complaints?area=Main&assigned_officer={officer_id}',headers=self.oh).json()), 1)
        self.assertEqual(self.client.get('/api/v1/authority/dashboard',headers=self.oh).json()['assigned'], 1)
        self.assertEqual(self.client.patch(base+'/assign',headers=self.oh,json={'assigned_department_id':2}).status_code, 403)
        self.assertEqual(self.client.patch(base+'/status',headers=self.oh,json={'status':'resolved'}).status_code, 409)
        self.assertEqual(self.client.patch(base+'/status',headers=self.oh,json={'status':'in_progress'}).status_code, 200)
        self.assertEqual(self.client.post(base+'/remarks',headers=self.oh,json={'text':'Repair underway'}).status_code, 201)
        with SessionLocal() as db:
            self.assertEqual(db.scalar(select(ComplaintRemark)).text, 'Repair underway')
        r = self.client.post(base+'/resolve',headers=self.oh,json={'resolution_notes':'Repaired','evidence_url':'https://example.com/photo.jpg'})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()['status'], 'verification_pending')
        verify = f'/api/v1/complaints/{cid}/verify'
        self.assertEqual(self.client.post(verify,headers=other,json={'resolved':True}).status_code, 403)
        self.assertEqual(self.client.post(verify,headers=self.ch,json={'resolved':True}).json()['verification_status'], 'approved')
        self.assertEqual(self.client.post(base+'/reopen',headers=self.oh).status_code, 200)
        self.assertEqual(self.client.post(base+'/resolve',headers=self.oh,json={'resolution_notes':'Repaired again'}).status_code, 200)
        r = self.client.post(verify,headers=self.ch,json={'resolved':False,'feedback':'Still broken'})
        self.assertEqual(r.json()['status'], 'reopened')
        self.assertEqual(r.json()['verification_status'], 'rejected')
        self.assertIsNone(r.json()['resolved_at'])
        timeline = f'/api/v1/complaints/{cid}/timeline'
        history = self.client.get(timeline,headers=self.ch).json()
        self.assertEqual(len(history), 9)
        self.assertEqual(history[0]['new_status'], 'submitted')
        self.assertEqual(history[-1]['remarks'], 'Still broken')
        self.assertEqual(history[-1]['action'], 'citizen_verification')
        self.assertEqual(history[-1]['verification_status'], 'rejected')
        self.assertEqual(history[-1]['changed_by_user_id'], self.citizen['id'])
        self.assertTrue(history[-1]['created_at'])
        self.assertEqual(self.client.get(timeline,headers=other).status_code, 403)
        self.assertEqual(self.client.get(timeline,headers=outsider).status_code, 403)

    def test_password_reset_expiry_attempts_and_replay(self):
        auth = '/api/v1/auth/'
        payload = {'email':'citizen@example.com'}
        unknown = self.client.post(auth+'forgot-password',json={'email':'nobody@example.com'})
        r = self.client.post(auth+'forgot-password',json=payload)
        self.assertEqual(r.json(), unknown.json())
        self.assertNotIn('otp', r.json())
        code = self.delivery.code
        r = self.client.post(auth+'verify-otp',json={**payload,'otp':code})
        self.assertEqual(r.status_code, 200, r.text)
        reset = r.json()['reset_token']
        self.assertEqual(self.client.post(auth+'verify-otp',json={**payload,'otp':code}).status_code, 400)
        new = 'new-local-password-493!'
        self.assertEqual(self.client.post(auth+'reset-password',json={'reset_token':reset,'new_password':new}).status_code, 200)
        self.assertEqual(self.client.post(auth+'reset-password',json={'reset_token':reset,'new_password':new}).status_code, 400)
        self.assertEqual(self.client.get(auth+'me',headers=self.ch).status_code, 401)
        self.assertEqual(self.client.post(auth+'login',json={**payload,'password':self.password}).status_code, 401)
        self.assertEqual(self.client.post(auth+'login',json={**payload,'password':new}).status_code, 200)
        with SessionLocal() as db:
            otp = db.scalar(select(PasswordOTP))
            otp.created_at = utc_now() - timedelta(minutes=2)
            db.commit()
        self.client.post(auth+'forgot-password',json=payload)
        code = self.delivery.code
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            self.assertEqual(self.client.post(auth+'verify-otp',json={**payload,'otp':wrong}).status_code, 400)
        self.assertEqual(self.client.post(auth+'verify-otp',json={**payload,'otp':code}).status_code, 400)
        with SessionLocal() as db:
            otp = db.scalar(select(PasswordOTP).order_by(PasswordOTP.id.desc()))
            otp.attempts = 0
            otp.expiry = utc_now() - timedelta(seconds=1)
            db.commit()
        self.assertEqual(self.client.post(auth+'verify-otp',json={**payload,'otp':code}).status_code, 400)

    def test_invalid_assignment_and_legacy_status_protection(self):
        c = self.create(self.ch)
        cid = c['id']
        base = f'/api/v1/authority/complaints/{cid}'
        self.assertEqual(self.client.patch(base+'/assign', headers=self.ah,
                         json={'assigned_department_id':9999}).status_code, 422)
        self.assertEqual(self.client.patch(base+'/assign', headers=self.ah,
                         json={'assigned_department_id':1,'assigned_officer_id':self.citizen['id']}).status_code, 422)
        legacy = f'/api/v1/complaints/{cid}/status'
        self.assertEqual(self.client.patch(legacy, headers=self.ch, json={'status':'under_review'}).status_code, 403)
        self.assertEqual(self.client.patch(legacy, headers=self.ah, json={'status':'under_review'}).status_code, 200)
        self.assertEqual(self.client.patch(legacy, headers=self.ah, json={'status':'resolved'}).status_code, 409)

    def test_disabled_user(self):
        with SessionLocal() as db:
            user = db.get(User, self.citizen['id'])
            user.is_active = False
            db.commit()
        self.assertEqual(self.client.get('/api/v1/auth/me',headers=self.ch).status_code, 401)

    def test_self_profile_update_is_limited_to_name_and_phone(self):
        route = '/api/v1/auth/me'
        self.assertEqual(self.client.patch(route,json={'full_name':'Updated'}).status_code,401)
        response = self.client.patch(route,headers=self.ch,json={'full_name':'Updated Citizen','phone':'9000000000'})
        self.assertEqual(response.status_code,200,response.text)
        self.assertEqual((response.json()['full_name'],response.json()['phone']),('Updated Citizen','9000000000'))
        for payload in [{}, {'role':'admin'}, {'department_id':1}, {'full_name':'   '}, {'full_name':None}]:
            self.assertEqual(self.client.patch(route,headers=self.ch,json=payload).status_code,422)

class DatabaseTests(unittest.TestCase):
    def test_fallback_and_postgres_engine(self):
        for value in ['', '   ']:
            with patch.dict(os.environ, {'DATABASE_URL':value}):
                self.assertTrue(Settings().database_url.startswith('sqlite:///'))
        e = build_engine('postgresql://placeholder:placeholder@localhost/db')
        self.assertEqual(e.dialect.driver, 'pg8000')
        e.dispose()

    def test_legacy_upgrade_preserves_data_and_is_idempotent(self):
        e = build_engine('sqlite:///' + _temp.name + '/legacy.db')
        with e.begin() as c:
            c.execute(text('CREATE TABLE complaints (id INTEGER PRIMARY KEY, title VARCHAR(200), description TEXT, category VARCHAR(100), severity VARCHAR(20), latitude FLOAT, longitude FLOAT, address VARCHAR(500), image_url VARCHAR(2048), status VARCHAR(30), assigned_department VARCHAR(100), created_at TIMESTAMP, updated_at TIMESTAMP)'))
            c.execute(text("INSERT INTO complaints (id, title, severity) VALUES (1, 'Preserved', 'high')"))
        initialize_database(e)
        initialize_database(e)
        with e.connect() as c:
            self.assertEqual(c.execute(text('SELECT title, priority, verification_status FROM complaints')).one(), ('Preserved','high','pending'))
        e.dispose()

if __name__ == '__main__':
    unittest.main()
