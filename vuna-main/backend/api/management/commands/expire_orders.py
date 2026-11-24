from django.core.management.base import BaseCommand

from api.checkout import expire_stale
from api.notifications import prune


class Command(BaseCommand):
    help = (
        'Expire order lines farmers did not answer within 2 hours, and accepted lines left unpaid. '
        'Also deletes read notifications older than 60 days.'
    )

    def handle(self, *args, **options):
        count = expire_stale()
        pruned = prune()
        self.stdout.write(self.style.SUCCESS(f'Expired {count} order line(s); removed {pruned} old notification(s).'))
