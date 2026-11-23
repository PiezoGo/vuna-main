from decimal import ROUND_HALF_UP, Decimal

from django.db import migrations


def backfill(apps, schema_editor):
    """Older products were saved without a listed price; compute it as base + 20% (api/pricing.py)."""
    Product = apps.get_model('api', 'Product')
    for product in Product.objects.filter(listed_price_per_unit__isnull=True):
        product.listed_price_per_unit = (product.base_price_per_unit * Decimal('1.20')).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP,
        )
        product.save(update_fields=['listed_price_per_unit'])


class Migration(migrations.Migration):
    dependencies = [('api', '0005_product_description_min_order')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
