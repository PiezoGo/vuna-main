from django.db import migrations

# Launch clusters named in the pitch deck. Admins add more in Django admin.
CLUSTERS = [
    ('Kiambu cluster', 'Kiambu'),
    ('Limuru cluster', 'Kiambu'),
    ('Naivasha cluster', 'Nakuru'),
]


def seed(apps, schema_editor):
    Cooperative = apps.get_model('api', 'Cooperative')
    for name, county in CLUSTERS:
        Cooperative.objects.get_or_create(name=name, defaults={'county': county})


def unseed(apps, schema_editor):
    Cooperative = apps.get_model('api', 'Cooperative')
    Cooperative.objects.filter(name__in=[name for name, _ in CLUSTERS], farmers__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [('api', '0003_accounts_approval_agents_cooperatives')]
    operations = [migrations.RunPython(seed, unseed)]
