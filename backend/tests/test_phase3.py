import io
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch
from pathlib import Path
import test_backend as legacy
from sqlalchemy import select, text, inspect, MetaData, TIMESTAMP
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from app.db.database import engine, SessionLocal, Base, build_engine
from app.db.initialize import initialize_database, migration_config
from app.models.complaint import Complaint, ComplaintStatus
from app.models.domain import User, Notification, ComplaintSuggestion, ComplaintEvidence
from app.core.rate_limit import limiter, SlidingWindowLimiter
from app.core.config import settings
from app.services.intelligence import category_suggestion, priority_suggestion

class Phase3Tests(unittest.TestCase):
    setUp = legacy.BackendTests.setUp
    tearDown = legacy.BackendTests.tearDown
    register = legacy.BackendTests.register
    login = legacy.BackendTests.login
    create = legacy.BackendTests.create
    assign = legacy.BackendTests.assign

    def test_admin_account_creation_filters_and_safe_edits(self):
        payload = {'full_name':'New Officer','email':'new.officer@example.com','employee_id':'EMP-TEST-3',
                   'designation':'Engineer','department_id':1,'temporary_password':self.password}
        self.assertEqual(self.client.post('/api/v1/admin/authorities',headers=self.ch,json=payload).status_code,403)
        self.assertEqual(self.client.post('/api/v1/admin/authorities',headers=self.oh,json=payload).status_code,403)
        r = self.client.post('/api/v1/admin/authorities',headers=self.ah,json=payload)
        self.assertEqual(r.status_code,201,r.text)
        self.assertEqual(r.json()['role'],'authority')
        self.assertNotIn('password_hash',r.json())
        self.assertNotIn('temporary_password',r.json())
        uid = r.json()['id']
        self.assertEqual(self.client.post('/api/v1/admin/authorities',headers=self.ah,json=payload).status_code,409)
        self.assertEqual(self.client.post('/api/v1/admin/authorities',headers=self.ah,json={**payload,'role':'admin'}).status_code,422)
        self.assertEqual(self.client.post('/api/v1/admin/authorities',headers=self.ah,json={**payload,'department_id':9999}).status_code,422)
        route = f'/api/v1/admin/users/{uid}'
        self.assertEqual(self.client.get(route,headers=self.ch).status_code,403)
        self.assertEqual(self.client.get(route,headers=self.ah).json()['employee_id'],'EMP-TEST-3')
        rows = self.client.get('/api/v1/admin/users?role=authority&department=1&is_active=true&search=New%20Officer',headers=self.ah).json()
        self.assertEqual([u['id'] for u in rows],[uid])
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'role':'admin'}).status_code,422)
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'password_hash':'bad'}).status_code,422)
        token = self.login('new.officer@example.com')
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'designation':'Senior','department_id':2}).status_code,200)
        self.assertEqual(self.client.get('/api/v1/auth/me',headers=token).status_code,401)
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'is_active':False}).status_code,200)
        self.assertEqual(self.client.get('/api/v1/admin/users?is_active=false',headers=self.ah).json()[0]['id'],uid)

    def test_workload_and_transfer_guard(self):
        c = self.create(self.ch)
        self.assign(c['id'])
        officers = self.client.get('/api/v1/admin/officers?department=1',headers=self.ah)
        self.assertEqual(officers.status_code,200,officers.text)
        officer = officers.json()[0]
        self.assertEqual(officer['active_assignments'],1)
        self.assertEqual(officer['resolved_complaints'],0)
        self.assertEqual(officer['current_status'],'busy')
        route = f"/api/v1/admin/users/{officer['id']}"
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'department_id':2}).status_code,409)
        self.assertEqual(self.client.patch(route,headers=self.ah,json={'is_active':False}).status_code,409)
        self.client.post(f"/api/v1/authority/complaints/{c['id']}/resolve",headers=self.oh,json={'resolution_notes':'Done'})
        self.client.post(f"/api/v1/complaints/{c['id']}/verify",headers=self.ch,json={'resolved':True})
        officer = self.client.get('/api/v1/admin/officers?department=1',headers=self.ah).json()[0]
        self.assertEqual(officer['active_assignments'],0)
        self.assertEqual(officer['resolved_complaints'],1)
        self.assertEqual(officer['current_status'],'available')
        self.assertEqual(self.client.get('/api/v1/admin/officers',headers=self.ch).status_code,403)

    def test_analytics_real_counts_dates_and_scope(self):
        c1, c2, c3 = self.create(self.ch), self.create(self.ch), self.create(self.ch)
        with SessionLocal() as db:
            for cid, department, status, day, hours in [(c1['id'],1,'resolved',1,4),(c2['id'],1,'submitted',2,None),(c3['id'],2,'resolved',3,8)]:
                c = db.get(Complaint,cid)
                c.assigned_department_id = department
                c.status = ComplaintStatus(status)
                c.created_at = datetime(2026,1,day,12)
                c.resolved_at = c.created_at + timedelta(hours=hours) if hours is not None else None
            db.commit()
        root = '/api/v1/authority/analytics/'
        r = self.client.get(root+'summary',headers=self.ah)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['total'],3)
        self.assertEqual(r.json()['resolved'],2)
        self.assertAlmostEqual(r.json()['average_resolution_hours'],6,places=5)
        self.assertEqual(r.json()['resolution_sample_count'],2)
        scoped = self.client.get(root+'summary',headers=self.oh).json()
        self.assertEqual(scoped['total'],2)
        self.assertAlmostEqual(scoped['average_resolution_hours'],4,places=5)
        dated = self.client.get(root+'summary?date_from=2026-01-02&date_to=2026-01-02',headers=self.ah).json()
        self.assertEqual(dated['total'],1)
        self.assertIsNone(dated['average_resolution_hours'])
        self.assertEqual(self.client.get(root+'categories',headers=self.ah).json(),[{'category':'Roads','total':3}])
        self.assertEqual([d['total'] for d in self.client.get(root+'departments',headers=self.ah).json()],[2,1])
        self.assertEqual([p['total'] for p in self.client.get(root+'priorities',headers=self.ah).json()],[3])
        self.assertEqual(len(self.client.get(root+'recent?date_from=2026-01-01&date_to=2026-01-02',headers=self.ah).json()),2)
        trends = self.client.get(root+'trends',headers=self.oh).json()
        self.assertEqual(trends,[{'date':'2026-01-01','total':1},{'date':'2026-01-02','total':1}])
        for suffix in ['summary','categories','departments','priorities','recent','trends']:
            self.assertEqual(self.client.get(root+suffix,headers=self.ch).status_code,403)
            self.assertEqual(self.client.get(root+suffix+'?date_from=2026-02-02&date_to=2026-01-01',headers=self.ah).status_code,422)

    def test_notifications_events_and_user_isolation(self):
        c = self.create(self.ch)
        self.assign(c['id'])
        base = f"/api/v1/authority/complaints/{c['id']}"
        self.client.patch(base+'/status',headers=self.oh,json={'status':'in_progress'})
        self.client.post(base+'/resolve',headers=self.oh,json={'resolution_notes':'Done'})
        self.client.post(f"/api/v1/complaints/{c['id']}/verify",headers=self.ch,json={'resolved':False})
        rows = self.client.get('/api/v1/notifications',headers=self.ch).json()
        self.assertEqual({n['type'] for n in rows},{'complaint_submitted','complaint_assigned','status_changed','resolution_submitted','verification_required','complaint_reopened'})
        self.assertTrue(all(n['user_id']==self.citizen['id'] for n in rows))
        other = self.login('other@example.com')
        self.assertEqual(self.client.get('/api/v1/notifications',headers=other).json(),[])
        read = f"/api/v1/notifications/{rows[0]['id']}/read"
        self.assertEqual(self.client.patch(read,headers=other).status_code,404)
        self.assertTrue(self.client.patch(read,headers=self.ch).json()['is_read'])
        self.assertEqual(self.client.patch('/api/v1/notifications/read-all',headers=other).json()['updated'],0)
        self.assertEqual(self.client.patch('/api/v1/notifications/read-all',headers=self.ch).json()['updated'],len(rows)-1)
        self.assertEqual(self.client.get('/api/v1/notifications?is_read=false',headers=self.ch).json(),[])
        self.assertTrue(self.client.get('/api/v1/notifications?is_read=false',headers=self.oh).json())

    def test_intelligence_duplicates_and_preserved_selection(self):
        payload = {'title':'Pothole broken road','description':'Damaged road pavement dangerous potholes',
                   'category':'Other','severity':'low','latitude':22,'longitude':77,'address':'Main road'}
        c = self.client.post('/api/v1/complaints',headers=self.ch,json=payload).json()
        self.assertEqual(c['category'],'Other')
        self.assertEqual(c['priority'],'low')
        analysis = {'title':payload['title'],'description':payload['description'],'latitude':22,'longitude':77}
        route = '/api/v1/intelligence/analyze-complaint'
        self.assertEqual(self.client.post(route,json=analysis).status_code,401)
        r = self.client.post(route,headers=self.ch,json=analysis)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['suggested_category'],'Roads & Infrastructure')
        self.assertEqual(r.json()['suggested_priority'],'high')
        self.assertEqual(r.json()['recommended_department']['name'],'Roads & Infrastructure')
        self.assertEqual(r.json()['possible_duplicates'],[{'complaint_id':c['id'],'similarity':1.0,
            'reason':'Similar title/description; locations within 0.00 km'}])
        other = self.login('other@example.com')
        self.assertEqual(self.client.post(route,headers=other,json=analysis).json()['possible_duplicates'],[])
        self.assertEqual(self.client.post(route,headers=self.ch,json={**analysis,'latitude':999}).status_code,422)
        with SessionLocal() as db:
            suggestion = db.scalar(select(ComplaintSuggestion).where(ComplaintSuggestion.complaint_id==c['id']))
            self.assertEqual(suggestion.suggested_category,'Roads & Infrastructure')
            self.assertEqual(suggestion.suggested_priority,'high')
            self.assertIsNotNone(suggestion.recommended_department_id)

    def test_authority_duplicates_are_scoped_and_never_merged(self):
        c1,c2 = self.create(self.ch),self.create(self.ch)
        self.assign(c1['id'])
        self.assign(c2['id'])
        route = f"/api/v1/authority/complaints/{c1['id']}/duplicates"
        self.assertEqual(self.client.get(route,headers=self.ch).status_code,403)
        duplicates = self.client.get(route,headers=self.oh).json()['possible_duplicates']
        self.assertEqual(duplicates,[{'complaint_id':c2['id'],'similarity':1.0,
            'reason':'Similar title/description; same category; locations within 0.00 km'}])
        outsider = self.login('outsider@example.com')
        self.assertEqual(self.client.get(route,headers=outsider).status_code,403)
        with SessionLocal() as db:
            self.assertEqual(len(db.scalars(select(Complaint)).all()),2)
            db.get(Complaint,c2['id']).created_at = datetime(2000,1,1)
            db.commit()
        self.assertEqual(self.client.get(route,headers=self.oh).json()['possible_duplicates'],[])

    def test_evidence_metadata_and_ownership(self):
        payload={'title':'Broken road','description':'Repair','category':'Other','latitude':1,'longitude':2,
                 'address':'Here','image_url':'https://example.com/report.jpg'}
        c=self.client.post('/api/v1/complaints',headers=self.ch,json=payload).json()
        route=f"/api/v1/complaints/{c['id']}/evidence"
        evidence=self.client.get(route,headers=self.ch).json()
        self.assertEqual(evidence[0]['evidence_type'],'report')
        self.assertEqual(evidence[0]['uploaded_by'],self.citizen['id'])
        other=self.login('other@example.com')
        self.assertEqual(self.client.get(route,headers=other).status_code,403)
        self.assertEqual(self.client.post(route,headers=self.ch,json={'image_url':'file:///local'}).status_code,422)
        self.assertEqual(self.client.post(route,headers=self.ch,json={'image_url':'https://example.com/a','evidence_type':'resolution'}).status_code,403)
        self.assertEqual(self.client.post(route,headers=self.ch,json={'image_url':'https://example.com/a'}).status_code,201)
        self.assign(c['id'])
        self.client.post(f"/api/v1/authority/complaints/{c['id']}/resolve",headers=self.oh,
                         json={'resolution_notes':'Done','evidence_url':'https://example.com/resolution.jpg'})
        evidence=self.client.get(route,headers=self.ch).json()
        self.assertEqual([e['evidence_type'] for e in evidence],['report','supporting','resolution'])

    def test_sensitive_endpoint_rate_limits(self):
        for endpoint, limit, payload in [
            ('login',settings.rate_limit_login,{'email':'unknown@example.com','password':'incorrect'}),
            ('register',settings.rate_limit_register,{'email':'bad'}),
            ('forgot-password',settings.rate_limit_forgot,{'email':'unknown@example.com'}),
            ('verify-otp',settings.rate_limit_verify,{'email':'unknown@example.com','otp':'000000'})]:
            limiter.clear()
            for _ in range(limit):
                r=self.client.post('/api/v1/auth/'+endpoint,json=payload)
                self.assertNotEqual(r.status_code,429)
            r=self.client.post('/api/v1/auth/'+endpoint,json=payload,headers={'X-Forwarded-For':'8.8.8.8'})
            self.assertEqual(r.status_code,429,endpoint)
            self.assertGreater(int(r.headers['Retry-After']),0)

class IntelligenceUnitTests(unittest.TestCase):
    def test_transparent_priority_and_unknown_category(self):
        self.assertEqual(priority_suggestion('Exposed live wire','Near playground')['priority'],'critical')
        self.assertEqual(priority_suggestion('Minor scratch','Cosmetic paint faded')['priority'],'low')
        self.assertEqual(priority_suggestion('Civic report','Please inspect')['priority'],'medium')
        self.assertEqual(category_suggestion('zzzz','qqqq')['category'],'Other')
        self.assertEqual(category_suggestion('zzzz','qqqq')['confidence'],0)

    def test_rate_window_recovers_and_bounds_keys(self):
        from fastapi import HTTPException
        limits=SlidingWindowLimiter(max_keys=1)
        limits.check('a',2,60,now=0)
        limits.check('a',2,60,now=1)
        with self.assertRaises(HTTPException): limits.check('a',2,60,now=2)
        with self.assertRaises(HTTPException): limits.check('b',2,60,now=2)
        limits.check('a',2,60,now=61)

class MigrationTests(unittest.TestCase):
    def test_fresh_schema_matches_models_and_round_trip(self):
        with tempfile.TemporaryDirectory() as folder:
            e=build_engine('sqlite:///'+folder+'/fresh.db')
            initialize_database(e)
            with e.connect() as c:
                self.assertEqual(c.scalar(text('SELECT version_num FROM alembic_version')),'0003_workflow_audit')
                self.assertEqual(compare_metadata(MigrationContext.configure(c),Base.metadata),[])
            cfg=migration_config()
            with e.begin() as c:
                cfg.attributes['connection']=c
                command.downgrade(cfg,'0001_phase2')
                self.assertNotIn('notifications',inspect(c).get_table_names())
                command.upgrade(cfg,'head')
            e.dispose()

    def test_existing_phase2_database_is_adopted_without_data_loss(self):
        with tempfile.TemporaryDirectory() as folder:
            e=build_engine('sqlite:///'+folder+'/existing.db')
            tables=[t for t in Base.metadata.sorted_tables if t.name not in {'notifications','complaint_evidence','complaint_suggestions'}]
            snapshot = MetaData()
            for table in tables:
                table.to_metadata(snapshot)
            snapshot.tables['complaints'].c.resolved_at.type = TIMESTAMP()
            # Freeze the legacy fixture rather than including later model additions.
            history = snapshot.tables['complaint_status_history']
            for name in ['action', 'verification_status', 'old_department_id', 'new_department_id', 'old_officer_id', 'new_officer_id']:
                column = history.c[name]
                for fk in list(column.foreign_keys):
                    history.constraints.discard(fk.constraint)
                    history.foreign_keys.discard(fk)
                history._columns.remove(column)
            for index in list(snapshot.tables['complaints'].indexes):
                snapshot.tables['complaints'].indexes.remove(index)
            snapshot.create_all(e)
            with e.begin() as c:
                c.execute(text("INSERT INTO departments (id,name,is_active) VALUES (50,'Existing department',1)"))
                c.execute(text("INSERT INTO users (id,full_name,email,password_hash,role,is_active,token_version,created_at,updated_at) VALUES (50,'Existing','existing@example.com','test-only-hash','citizen',1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)"))
            initialize_database(e)
            initialize_database(e)
            with e.connect() as c:
                self.assertEqual(c.scalar(text('SELECT name FROM departments WHERE id=50')),'Existing department')
                self.assertEqual(c.scalar(text('SELECT full_name FROM users WHERE id=50')),'Existing')
                cfg = migration_config()
                cfg.attributes['connection'] = c
                command.check(cfg)
            e.dispose()

    def test_postgresql_offline_migrations_compile_without_credentials(self):
        from dataclasses import replace
        with patch('app.core.config.settings',replace(settings,database_url='postgresql://localhost/example')):
            cfg=migration_config()
            output=io.StringIO()
            cfg.output_buffer=output
            command.upgrade(cfg,'head',sql=True)
            sql=output.getvalue()
            self.assertIn('CREATE TABLE notifications',sql)
            self.assertIn('CREATE TABLE users',sql)
            self.assertEqual(sql.count('CONSTRAINT complaintstatus CHECK'),1)
            self.assertNotIn('DROP TABLE',sql)

if __name__=='__main__': unittest.main()
