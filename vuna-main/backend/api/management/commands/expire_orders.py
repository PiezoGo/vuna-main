from django.core.management.base import BaseCommand

from api.checkout import expire_stale


class Command(BaseCommand):
    help = 'Expire order lines farmers did not answer within 2 hours, and accepted lines left unpaid.'

    def handle(self, *args, **options):
        count = expire_stale()
        self.stdout.write(self.style.SUCCESS(f'Expired {count} order line(s).'))
