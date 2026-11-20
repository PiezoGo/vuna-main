from decimal import Decimal

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from api.models import Product, User
from api.pricing import listed_price

_counter = {'n': 0}


def make_user(role, **extra):
    _counter['n'] += 1
    n = _counter['n']
    email = f'{role}{n}@test.vuna'
    return User.objects.create_user(
        email=email, username=email, password='Str0ng-pass!', full_name=f'{role.title()} {n}',
        role=role, phone_number=f'+2547000000{n:02d}', city=extra.pop('city', 'Nairobi'),
        market=extra.pop('market', 'Wakulima'),
        approval_status=extra.pop('approval_status', 'approved'), **extra,
    )


def make_product(farmer, base='100.00', quantity=50, **extra):
    base = Decimal(base)
    defaults = dict(title='Tomatoes', commodity='tomatoes', unit='kg', is_active=True)
    defaults.update(extra)
    return Product.objects.create(
        farmer=farmer, base_price_per_unit=base, listed_price_per_unit=listed_price(base),
        quantity=quantity, **defaults,
    )


def client_for(user=None):
    client = APIClient()
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client
