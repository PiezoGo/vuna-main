import os
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from api.models import User


class SeedAdminTests(TestCase):
    def run_cmd(self, **env):
        with mock.patch.dict(os.environ, env, clear=False):
            out = StringIO()
            call_command('seed_admin', stdout=out, stderr=out)
            return out.getvalue()

    def test_creates_admin_from_env_once(self):
        self.run_cmd(ADMIN_EMAIL='Owner@Vuna.test', ADMIN_PASSWORD='a-long-password-1')
        user = User.objects.get(email='owner@vuna.test')
        self.assertEqual(user.role, 'admin')
        self.assertTrue(user.check_password('a-long-password-1'))
        self.assertIn('already exists', self.run_cmd(ADMIN_EMAIL='owner@vuna.test', ADMIN_PASSWORD='different-password-2'))
        user.refresh_from_db()
        self.assertTrue(user.check_password('a-long-password-1'))

    def test_refuses_short_password_and_disables_old_default(self):
        User.objects.create_user(email='admin@vuna.co.ke', username='admin@vuna.co.ke', password='admin123',
                                 full_name='Old', role='admin', phone_number='254700000000')
        self.run_cmd(ADMIN_EMAIL='x@vuna.test', ADMIN_PASSWORD='short')
        self.assertFalse(User.objects.filter(email='x@vuna.test').exists())
        self.assertFalse(User.objects.get(email='admin@vuna.co.ke').check_password('admin123'))
