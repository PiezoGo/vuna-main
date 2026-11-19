from decimal import Decimal

from django.test import SimpleTestCase

from api.pricing import listed_price, price_order


class PricingTests(SimpleTestCase):
    def test_listed_price_adds_20_percent_logistics(self):
        self.assertEqual(listed_price(Decimal('100.00')), Decimal('120.00'))

    def test_buyer_pays_listed_price_and_farmer_pays_platform_fee(self):
        p = price_order(Decimal('100.00'), 10)
        self.assertEqual(p.buyer_total, Decimal('1200.00'))      # listed × qty, no extra fee
        self.assertEqual(p.logistics_fee, Decimal('200.00'))
        self.assertEqual(p.platform_fee, Decimal('80.00'))       # 8% of base, from the farmer
        self.assertEqual(p.farmer_earnings, Decimal('920.00'))   # 92% of base

    def test_parts_always_add_up_to_buyer_total(self):
        for base, qty in [('33.33', 7), ('0.01', 1), ('149.99', 13), ('1000', 250)]:
            p = price_order(Decimal(base), qty)
            self.assertEqual(p.farmer_earnings + p.platform_fee + p.logistics_fee, p.buyer_total)
