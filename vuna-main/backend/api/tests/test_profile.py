from django.test import TestCase

from .factories import client_for, make_user


class ProfileTests(TestCase):
    def test_user_cannot_promote_themselves(self):
        buyer = make_user('buyer')
        res = client_for(buyer).put('/api/profile/', {'role': 'admin', 'is_driver_active': True, 'bio': 'Hotel buyer'})
        self.assertEqual(res.status_code, 200)
        buyer.refresh_from_db()
        self.assertEqual(buyer.role, 'buyer')
        self.assertEqual(buyer.bio, 'Hotel buyer')
        self.assertEqual(res.data['role'], 'buyer')

    def test_register_cannot_create_admin_or_driver(self):
        for role in ('admin', 'driver'):
            res = client_for().post('/api/register/', {
                'email': f'{role}@x.test', 'password': 'Str0ng-pass!', 'full_name': 'X',
                'role': role, 'phone_number': '0712345678',
            })
            self.assertEqual(res.status_code, 400, role)
