from decimal import Decimal

from django.test import TestCase

from api.models import Product
from .factories import client_for, make_product, make_user


class PublicCatalogueTests(TestCase):
    def setUp(self):
        self.farmer = make_user('farmer', city='Nakuru', market='Marikiti')
        self.other = make_user('farmer', city='Nairobi', market='Wakulima')
        self.active = make_product(self.farmer, title='Red onions', commodity='onions')
        self.hidden = make_product(self.farmer, title='Old stock', is_active=False)
        make_product(self.other, title='Sukuma wiki', commodity='kale', base='50')

    def test_anonymous_can_list_active_products_paginated(self):
        res = client_for().get('/api/products/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 2)
        titles = {p['title'] for p in res.data['results']}
        self.assertNotIn('Old stock', titles)

    def test_anonymous_does_not_see_farmer_phone(self):
        res = client_for().get(f'/api/products/{self.active.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data['farmer_phone'])

    def test_signed_in_user_sees_farmer_phone(self):
        res = client_for(make_user('buyer')).get(f'/api/products/{self.active.id}/')
        self.assertEqual(res.data['farmer_phone'], self.farmer.phone_number)

    def test_inactive_product_is_not_public(self):
        self.assertEqual(client_for().get(f'/api/products/{self.hidden.id}/').status_code, 404)

    def test_filters_and_search(self):
        c = client_for()
        self.assertEqual(c.get('/api/products/', {'city': 'nakuru'}).data['count'], 1)
        self.assertEqual(c.get('/api/products/', {'market': 'Wakulima'}).data['count'], 1)
        self.assertEqual(c.get('/api/products/', {'commodity': 'kale'}).data['count'], 1)
        self.assertEqual(c.get('/api/products/', {'search': 'onion'}).data['count'], 1)
        cheapest = c.get('/api/products/', {'ordering': 'listed_price_per_unit'}).data['results'][0]
        self.assertEqual(cheapest['title'], 'Sukuma wiki')

    def test_my_listings_requires_farmer_and_includes_inactive_unpaginated(self):
        self.assertEqual(client_for().get('/api/products/', {'my_listings': 'true'}).status_code, 401)
        res = client_for(self.farmer).get('/api/products/', {'my_listings': 'true'})
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.data, list)
        self.assertEqual(len(res.data), 2)


class ProductWritePermissionTests(TestCase):
    def setUp(self):
        self.owner = make_user('farmer')
        self.product = make_product(self.owner)
        self.payload = {'title': 'Cabbage', 'commodity': 'cabbage', 'unit': 'piece',
                        'base_price_per_unit': '40.00', 'quantity': 10}

    def test_only_farmers_create_and_listed_price_is_server_side(self):
        for role in ('buyer', 'driver'):
            res = client_for(make_user(role)).post('/api/products/', self.payload)
            self.assertEqual(res.status_code, 403, role)
        self.assertEqual(client_for().post('/api/products/', self.payload).status_code, 401)

        res = client_for(self.owner).post(
            '/api/products/', {**self.payload, 'listed_price_per_unit': '1.00'}
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data['listed_price_per_unit']), Decimal('48.00'))

    def test_rejects_zero_price(self):
        res = client_for(self.owner).post('/api/products/', {**self.payload, 'base_price_per_unit': '0'})
        self.assertEqual(res.status_code, 400)

    def test_other_farmer_and_buyer_cannot_edit_or_delete(self):
        url = f'/api/products/{self.product.id}/'
        for user in (make_user('farmer'), make_user('buyer'), make_user('driver')):
            c = client_for(user)
            self.assertEqual(c.patch(url, {'title': 'Hacked'}).status_code, 403)
            self.assertEqual(c.delete(url).status_code, 403)
        self.product.refresh_from_db()
        self.assertEqual(self.product.title, 'Tomatoes')

    def test_owner_edit_recomputes_listed_price(self):
        res = client_for(self.owner).patch(f'/api/products/{self.product.id}/', {'base_price_per_unit': '200'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(res.data['listed_price_per_unit']), Decimal('240.00'))

    def test_admin_can_moderate(self):
        admin = make_user('admin')
        url = f'/api/products/{self.product.id}/'
        self.assertEqual(client_for(admin).patch(url, {'title': 'Edited'}).status_code, 200)
        self.assertEqual(client_for(admin).delete(url).status_code, 204)
        self.assertFalse(Product.objects.filter(pk=self.product.pk).exists())
