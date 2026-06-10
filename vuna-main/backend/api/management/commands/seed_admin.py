from django.core.management.base import BaseCommand
from api.models import User


class Command(BaseCommand):
    help = 'Seed the database with an admin user'

    def handle(self, *args, **options):
        email = 'admin@vuna.co.ke'
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'Admin user {email} already exists.'))
            return

        User.objects.create_superuser(
            email=email,
            username=email,
            password='admin123',
            full_name='Vuna Admin',
            role='admin',
            phone_number='+254700000000',
        )
        self.stdout.write(self.style.SUCCESS(f'Admin user created: {email} / admin123'))
