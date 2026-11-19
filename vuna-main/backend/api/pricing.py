"""
Single source of truth for VUNA pricing. Clients must display these values, never recompute them.

Model (confirmed by the product owner, 2026-11-19):
    listed price per unit = base price × 1.20   (20% logistics fee, paid by the buyer)
    buyer pays            = listed price × quantity   (no extra fee on top)
    platform fee (VUNA)   = base price × quantity × 0.08   (taken from the farmer)
    farmer earnings       = base price × quantity × 0.92
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

LOGISTICS_RATE = Decimal('0.20')
PLATFORM_RATE = Decimal('0.08')
CENT = Decimal('0.01')


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def listed_price(base_price_per_unit: Decimal) -> Decimal:
    return _money(Decimal(base_price_per_unit) * (1 + LOGISTICS_RATE))


@dataclass(frozen=True)
class OrderPricing:
    buyer_total: Decimal
    logistics_fee: Decimal
    platform_fee: Decimal
    farmer_earnings: Decimal


def price_order(base_price_per_unit: Decimal, quantity: int) -> OrderPricing:
    base_total = Decimal(base_price_per_unit) * quantity
    logistics_fee = _money(base_total * LOGISTICS_RATE)
    platform_fee = _money(base_total * PLATFORM_RATE)
    farmer_earnings = _money(base_total) - platform_fee
    buyer_total = _money(base_total) + logistics_fee
    return OrderPricing(
        buyer_total=buyer_total,
        logistics_fee=logistics_fee,
        platform_fee=platform_fee,
        farmer_earnings=farmer_earnings,
    )
