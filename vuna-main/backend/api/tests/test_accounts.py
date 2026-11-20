from django.core.cache import cache
from django.test import TestCase

from api.accounts import generate_one_time_password
from api.models import Cooperative, User
from api.phone import normalize_ke_phone

from .factories import client_for, make_product, make_user


class PhoneTests(TestCase):
    def test_normalizes_common_formats(self):
        for raw in ['0712345678', '0712 345 678', '+254712345678', '254712345678', '712345678', '0712-345-678']:
            self.assertEqual(normalize_ke_phone(raw), '254712345678', raw)
        self.assertEqual(normalize_ke_phone('0110123456'), '254110123456')

    def test_rejects_invalid(self):
        for raw in ['', '12345', '0812345678', '+255712345678', 'abc']:
            self.assertIsNone(normalize_ke_phone(raw), raw)


class RegisterTests(TestCase):
    def setUp(self):
        cache.clear()

    def payload(self, **extra):
        data = {
            'email': 'new@test.vuna', 'password': 'Harvest-2026!', 'full_name': 'Wanjiku Kamau',
            'role': 'farmer', 'phone_number': '0712 345 678', 'city': 'Limuru',
        }
        data.update(extra)
        return data

    def test_farmer_starts_pending_with_normalized_phone_and_cooperative(self):
        coop = Cooperative.objects.get(name='Limuru cluster')
        res = client_for().post('/api/register/', self.payload(cooperative=coop.id))
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['user']['approval_status'], 'pending')
        self.assertEqual(res.data['user']['phone_number'], '254712345678')
        self.assertEqual(res.data['user']['cooperative_name'], 'Limuru cluster')

    def test_buyer_is_approved_and_needs_a_type(self):
        res = client_for().post('/api/register/', self.payload(role='buyer'))
        self.assertEqual(res.status_code, 400)
        self.assertIn('buyer_type', res.data)
        res = client_for().post('/api/register/', self.payload(role='buyer', buyer_type='hotel'))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['user']['approval_status'], 'approved')

    def test_rejects_weak_password_bad_phone_and_staff_roles(self):
        self.assertIn('password', client_for().post('/api/register/', self.payload(password='123')).data)
        self.assertIn('phone_number', client_for().post('/api/register/', self.payload(phone_number='999')).data)
        for role in ('admin', 'driver', 'agent'):
            self.assertEqual(client_for().post('/api/register/', self.payload(role=role)).status_code, 400)


class ApprovalTests(TestCase):
    def setUp(self):
        self.admin = make_user('admin')
        self.farmer = make_user('farmer', approval_status='pending')
        self.product = make_product(self.farmer, title='Pending carrots')

    def test_pending_farmers_listings_are_hidden_until_approved(self):
        public = client_for()
        self.assertEqual(public.get('/api/products/').data['count'], 0)
        self.assertEqual(public.get(f'/api/products/{self.product.id}/').status_code, 404)
        # The farmer still sees their own listing
        mine = client_for(self.farmer).get('/api/products/', {'my_listings': 'true'}).data
        self.assertEqual(len(mine), 1)

        res = client_for(self.admin).post(f'/api/admin/farmers/{self.farmer.uid}/approve/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(public.get('/api/products/').data['count'], 1)

    def test_admin_lists_pending_and_rejects_with_reason(self):
        res = client_for(self.admin).get('/api/admin/farmers/', {'status': 'pending'})
        self.assertEqual([f['uid'] for f in res.data], [str(self.farmer.uid)])
        self.assertEqual(res.data[0]['listings'], 1)
        self.assertEqual(client_for(self.admin).post(f'/api/admin/farmers/{self.farmer.uid}/reject/').status_code, 400)
        res = client_for(self.admin).post(f'/api/admin/farmers/{self.farmer.uid}/reject/', {'reason': 'Phone unreachable'})
        self.assertEqual(res.data['approval_status'], 'rejected')
        me = client_for(self.farmer).get('/api/profile/').data
        self.assertEqual(me['rejection_reason'], 'Phone unreachable')

    def test_only_admins_manage_approvals(self):
        for user in (self.farmer, make_user('buyer'), make_user('agent')):
            self.assertEqual(client_for(user).get('/api/admin/farmers/').status_code, 403)
            self.assertEqual(client_for(user).post(f'/api/admin/farmers/{self.farmer.uid}/approve/').status_code, 403)


class OneTimePasswordTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user('admin')

    def test_generated_passwords_are_unambiguous_and_random(self):
        passwords = {generate_one_time_password() for _ in range(50)}
        self.assertEqual(len(passwords), 50)
        for p in passwords:
            self.assertEqual(len(p), 10)
            self.assertFalse(set(p) & set('0O1lI'))

    def test_admin_creates_agent_who_must_change_password(self):
        res = client_for(self.admin).post('/api/admin/staff/', {
            'role': 'agent', 'full_name': 'Ian Wahome', 'phone_number': '0722000111', 'email': 'ian@vuna.test',
        })
        self.assertEqual(res.status_code, 201, res.data)
        otp = res.data['one_time_password']
        self.assertTrue(res.data['user']['must_change_password'])
        self.assertFalse(User.objects.get(email='ian@vuna.test').check_password('driver123'))

        login = client_for().post('/api/login/', {'email': 'ian@vuna.test', 'password': otp})
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.data['user']['must_change_password'])

        agent = User.objects.get(email='ian@vuna.test')
        change = client_for(agent).post('/api/auth/change-password/', {'current_password': otp, 'new_password': 'Harvest-2026!'})
        self.assertEqual(change.status_code, 200, change.data)
        self.assertFalse(change.data['must_change_password'])

    def test_legacy_driver_endpoint_no_longer_uses_a_shared_password(self):
        res = client_for(self.admin).post('/api/admin/drivers/', {'full_name': 'Otieno', 'phone_number': '0733000222'})
        self.assertEqual(res.status_code, 201)
        driver = User.objects.get(email=res.data['login_email'])
        self.assertFalse(driver.check_password('driver123'))
        self.assertTrue(driver.check_password(res.data['one_time_password']))
        self.assertEqual(driver.phone_number, '254733000222')

    def test_reset_password_signs_the_user_out(self):
        buyer = make_user('buyer')
        old_client = client_for(buyer)
        res = client_for(self.admin).post(f'/api/admin/users/{buyer.uid}/reset-password/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(old_client.get('/api/profile/').status_code, 401)
        self.assertEqual(client_for(self.admin).post(f'/api/admin/users/{self.admin.uid}/reset-password/').status_code, 400)


class ChangePasswordTests(TestCase):
    def test_requires_correct_current_password_and_a_strong_new_one(self):
        user = make_user('buyer')
        c = client_for(user)
        self.assertEqual(c.post('/api/auth/change-password/', {'current_password': 'wrong', 'new_password': 'Harvest-2026!'}).status_code, 400)
        self.assertEqual(c.post('/api/auth/change-password/', {'current_password': 'Str0ng-pass!', 'new_password': 'abc'}).status_code, 400)
        self.assertEqual(c.post('/api/auth/change-password/', {'current_password': 'Str0ng-pass!', 'new_password': 'Harvest-2026!'}).status_code, 200)


class LoginThrottleTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_login_is_throttled_after_10_attempts_per_minute(self):
        make_user('buyer')
        c = client_for()
        codes = [c.post('/api/login/', {'email': 'x@test.vuna', 'password': 'nope'}).status_code for _ in range(11)]
        self.assertEqual(codes[:10], [401] * 10)
        self.assertEqual(codes[10], 429)


class CooperativeTests(TestCase):
    def test_public_list(self):
        res = client_for().get('/api/cooperatives/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([c['name'] for c in res.data], ['Kiambu cluster', 'Limuru cluster', 'Naivasha cluster'])
