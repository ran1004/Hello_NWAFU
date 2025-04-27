from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

from activities.models import Activity

obj = Activity.objects.first()
print(obj.published_at)  # 应显示: 2025-04-26 08:40:34+08:00