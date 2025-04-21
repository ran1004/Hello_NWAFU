from django.db import models

# Create your models here.
# activity/models.py（修正后）
from django.db import models
from django.utils import timezone

class Activity(models.Model):
    publisher = models.CharField(max_length=100, verbose_name="发布人")
    title = models.CharField(max_length=200, verbose_name="活动标题")
    content = models.TextField(verbose_name="活动内容")
    activity_time = models.DateTimeField(verbose_name="活动时间")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")

    def __str__(self):
        return self.title