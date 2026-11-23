import os

from django.core.management.base import BaseCommand

from api.models import User

LEGACY_EMAIL = 'admin@vuna.co.ke'
LEGACY_PASSWORD = 'admin123'  # shipped in an earlier version of this command; never valid again


class Command(BaseCommand):
    help = (
        'Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (safe to run on every deploy), '
        'and disable the old admin@vuna.co.ke / admin123 account if it still has that password.'
    )

    def handle(self, *args, **options):
        legacy = User.objects.filter(email=LEGACY_EMAIL).first()
        if legacy and legacy.check_password(LEGACY_PASSWORD):
            legacy.set_unusable_password()
            legacy.save(update_fields=['password'])
            self.stdout.write(self.style.WARNING(f'Disabled the default password on {LEGACY_EMAIL}.'))

        email = os.environ.get('ADMIN_EMAIL', '').strip().lower()
        password = os.environ.get('ADMIN_PASSWORD', '')
        if not email or not password:
            self.stdout.write('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created.')
            return
        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write(f'Admin {email} already exists: left unchanged.')
            return
        if len(password) < 12:
            self.stderr.write(self.style.ERROR('ADMIN_PASSWORD must be at least 12 characters: no admin created.'))
            return
        User.objects.create_superuser(
            email=email,
            username=email,
            password=password,
            full_name=os.environ.get('ADMIN_NAME', 'VUNA Admin'),
            role='admin',
            phone_number=os.environ.get('ADMIN_PHONE', '254700000000'),
        )
        self.stdout.write(self.style.SUCCESS(f'Admin {email} created.'))
