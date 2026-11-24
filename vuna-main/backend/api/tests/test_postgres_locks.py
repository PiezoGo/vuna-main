"""
Regression: PostgreSQL refuses FOR UPDATE on the nullable side of an outer join
("FOR UPDATE cannot be applied to the nullable side of an outer join"). SQLite has no row
locks, so the normal tests can't see it. These tests compile queries the way PostgreSQL would
and check the source for the unsafe pattern.
"""
import re
from pathlib import Path

from django.db.backends.postgresql.base import DatabaseWrapper
from django.test import SimpleTestCase

from api.fulfilment import lock_orders
from api.models import Order


def postgres_sql(queryset) -> str:
    """Compile a queryset for PostgreSQL without a server."""
    pg = DatabaseWrapper({
        'NAME': 'x', 'USER': 'x', 'PASSWORD': '', 'HOST': '', 'PORT': '', 'OPTIONS': {}, 'TIME_ZONE': None,
        'CONN_MAX_AGE': 0, 'CONN_HEALTH_CHECKS': False, 'AUTOCOMMIT': True, 'ATOMIC_REQUESTS': False, 'TEST': {},
    }, 'postgres-compile-only')
    pg.get_autocommit = lambda: False
    pg.in_atomic_block = True
    return queryset.query.get_compiler(connection=pg).as_sql()[0]


class PostgresLockTests(SimpleTestCase):
    def test_trip_queries_lock_only_order_rows(self):
        sql = postgres_sql(lock_orders(Order.objects.select_related('checkout', 'trip').filter(id__in=[1, 2])))
        self.assertIn('LEFT OUTER JOIN', sql)
        self.assertTrue(sql.rstrip().endswith('FOR UPDATE OF "api_order"'), sql[-80:])

    def test_unsafe_pattern_is_gone(self):
        """Any select_for_update() joined to a nullable relation must name the locked table (of=...)."""
        api = Path(__file__).resolve().parents[1]
        nullable = ('trip', 'checkout', 'driver', 'agent', 'cooperative', 'deducted_on', 'decided_by')
        offenders = []
        for path in api.glob('*.py'):
            for n, line in enumerate(path.read_text().splitlines(), 1):
                match = re.search(r"select_for_update\(\)\.select_related\(([^)]*)\)", line)
                if match and any(f"'{name}" in match.group(1) for name in nullable):
                    offenders.append(f'{path.name}:{n}')
        self.assertEqual(offenders, [])
