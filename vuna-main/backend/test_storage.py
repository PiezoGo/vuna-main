import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()
from django.core.files.storage import default_storage
print(type(default_storage))
print(default_storage.__class__)
# wait default_storage is a LazyObject, we need to access its backend
try:
    print(default_storage._wrapped)
except:
    pass
