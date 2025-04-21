# checkins/models.py

from django.db import models
from django.contrib.auth.models import User

# 在项目中定义了一个名为 Checkin 的模型，并且运行了 python manage.py makemigrations 和 python manage.py migrate 命令，
# Django 会根据你的模型定义自动生成 checkins_checkin 表。
# 这是 Django 的标准行为：每个应用的模型都会生成一个以 应用名_模型名小写 命名的数据库表

class Checkin(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='checkins')
    checkin_time = models.DateTimeField()

    class Meta:
        ordering = ['checkin_time']
        # db_table = "custom_checkin_table"  # 数据库中的实际表名

    def __str__(self):
        return f"{self.user.username} - {self.checkin_time}"