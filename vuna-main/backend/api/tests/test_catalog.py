from django.test import TestCase

from api.models import Cooperative

from .factories import client_for, make_product, make_user


class ProductFieldsTests(TestCase):
    def test_description_and_minimum_order(self):
        farmer = make_user('farmer')
        res = client_for(farmer).post('/api/products/', {
            'title': 'Red onions', 'commodity': 'onions', 'unit': 'kg', 'base_price_per_unit': '80',
            'quantity': 500, 'description': 'Dry, cured, 90 kg bags', 'min_order_quantity': 50,
        })
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['min_order_quantity'], 50)
        self.assertEqual(res.data['description'], 'Dry, cured, 90 kg bags')
        bad = client_for(farmer).post('/api/products/', {
            'title': 'x', 'unit': 'kg', 'base_price_per_unit': '80', 'quantity': 5, 'min_order_quantity': 0,
        })
        self.assertEqual(bad.status_code, 400)

    def test_sold_out_products_leave_the_market_but_their_page_still_opens(self):
        farmer = make_user('farmer')
        sold_out = make_product(farmer, quantity=0)
        public = client_for()
        self.assertEqual(public.get('/api/products/').data['count'], 0)
        self.assertEqual(public.get(f'/api/products/{sold_out.id}/').status_code, 200)

    def test_cooperative_shown_on_products(self):
        coop = Cooperative.objects.get(name='Limuru cluster')
        farmer = make_user('farmer', cooperative=coop)
        product = make_product(farmer)
        self.assertEqual(client_for().get(f'/api/products/{product.id}/').data['farmer_cooperative'], 'Limuru cluster')


class FacetTests(TestCase):
    def test_counts_only_live_listings_from_approved_farmers(self):
        a = make_user('farmer', city='Limuru', market='Wakulima')
        b = make_user('farmer', city='limuru ', market='Marikiti')
        pending = make_user('farmer', city='Naivasha', approval_status='pending')
        make_product(a, commodity='Tomatoes')
        make_product(a, commodity='tomatoes')
        make_product(b, commodity='Kale')
        make_product(b, commodity='Kale', quantity=0)
        make_product(pending, commodity='Carrots')

        res = client_for().get('/api/products/facets/')
        self.assertEqual(res.status_code, 200)
        commodities = {f['value'].lower(): f['count'] for f in res.data['commodities']}
        self.assertEqual(commodities, {'tomatoes': 2, 'kale': 1})
        self.assertNotIn('naivasha', [c['value'].lower() for c in res.data['cities']])
        self.assertEqual({m['value'] for m in res.data['markets']}, {'Wakulima', 'Marikiti'})


class FarmerProfileTests(TestCase):
    def test_profile_hides_email_and_shows_only_live_listings(self):
        farmer = make_user('farmer')
        make_product(farmer, title='Kale')
        make_product(farmer, title='Old', is_active=False)
        self.assertEqual(client_for().get(f'/api/profile/{farmer.uid}/').status_code, 401)
        res = client_for(make_user('buyer')).get(f'/api/profile/{farmer.uid}/')
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('email', res.data)
        self.assertNotIn('must_change_password', res.data)
        self.assertEqual([p['title'] for p in res.data['products']], ['Kale'])
        self.assertEqual(res.data['phone_number'], farmer.phone_number)
