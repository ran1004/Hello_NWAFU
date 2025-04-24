from django.db import models
from activity.models import Activity
from accounts.models import User

class ExportTemplate(models.Model):
    """导出模板模型"""
    name = models.CharField(max_length=100)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    fields = models.JSONField()  # 存储需要导出的字段配置
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)