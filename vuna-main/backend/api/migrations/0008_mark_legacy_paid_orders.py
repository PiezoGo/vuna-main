from django.db import migrations

PAID_STATES = ['paid', 'assigned', 'collected', 'in_transit', 'delivered', 'completed']


def mark_paid(apps, schema_editor):
    Order = apps.get_model('api', 'Order')
    Order.objects.filter(status__in=PAID_STATES).update(is_paid=True)


class Migration(migrations.Migration):
    dependencies = [('api', '0007_checkout_addresses_order_states')]
    operations = [migrations.RunPython(mark_paid, migrations.RunPython.noop)]
