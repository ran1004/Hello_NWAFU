from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

# 使用 ORM 删除记录
MigrationRecorder.Migration.objects.filter(app='admin').delete()