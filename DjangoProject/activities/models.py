from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.db import models

# Create your models here.
from django.db import models
from django.db.models.expressions import F
from django.dispatch.dispatcher import receiver
from django.utils.translation import gettext_lazy as _

from DjangoProject import settings
from login.models import User  # 从login应用导入自定义用户模型
from django.utils import timezone  # 必须导入
from django.db.models.signals import post_save
from checkins.models import CheckinRecord  # 假设有打卡模型

import logging
logger = logging.getLogger(__name__)  # 添加这行


class Activity(models.Model):
    # ================= 核心关系 =================
    objects = models.Manager()
    creator = models.ForeignKey(
        User,
        on_delete=models.PROTECT,  # 防止误删用户导致活动丢失
        related_name='created_activities',
        verbose_name=_("发布人"),
        help_text="活动创建者"
    )

    # ================= 内容信息 =================
    title = models.CharField(
        max_length=255,
        verbose_name=_("活动标题"),
        help_text="建议不超过50字"
    )
    content = models.TextField(
        verbose_name=_("活动详情"),
        help_text="支持Markdown格式"
    )
    ACTIVITY_TYPES = (
        ('checkin', _("打卡活动")),
        ('notification', _("通知活动")),
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPES,
        default='checkin',
        verbose_name=_("活动类型"),
        db_index=True
    )

    # ================= 时间控制 =================
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("创建时间"),
        db_index=True  # 加速后台管理查询
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("发布时间"),
        help_text="前端展示的时间（可预约未来发布）"
    )
    start_time = models.DateTimeField(
        verbose_name=_("开始时间"),
        db_index=True  # 重要查询字段
    )
    end_time = models.DateTimeField(
        verbose_name=_("结束时间")
    )

    # ================= 地理位置 =================
    location_name = models.CharField(
        max_length=100,
        verbose_name=_("地点名称"),
        help_text="如：教学楼A101"
    )
    latitude = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("纬度"),
        help_text="用于地图定位"
    )
    longitude = models.FloatField(
        null=True,
        blank=True,
        verbose_name=_("经度")
    )

    # ================= 多媒体 =================
    cover_image = models.ImageField(
        upload_to=models.ImageField('activity_images/'),
        verbose_name=_("封面图"),
        help_text="建议尺寸 16:9"
    )
    image_gallery = models.JSONField(
        default=list,
        verbose_name=_("活动图集"),
        help_text="存储图片URL数组"
    )

    max_participants = models.PositiveIntegerField(
        default=0,
        verbose_name=_("最大参与人数"),
        help_text="0表示不限人数"
    )

    current_participants = models.PositiveIntegerField(
        default=0,
        editable=False,
        verbose_name=_("当前参与人数")
    )

    # ================= 状态控制 =================
    STATUS_CHOICES = (
        ('draft', _("草稿")),
        ('published', _("已发布")),
        ('canceled', _("已取消")),
        ('completed', _("已结束"))
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name=_("状态"),
        db_index=True
    )
    is_approved = models.BooleanField(
        default=False,
        verbose_name=_("审核状态"),
        help_text="管理员审核通过后才可见"
    )

    class Meta:
        verbose_name = _("活动")
        verbose_name_plural = _("活动列表")
        ordering = ['-published_at']  # 默认按发布时间倒序
        indexes = [
            models.Index(fields=['start_time', 'end_time']),  # 时间范围查询优化
            models.Index(fields=['status', 'published_at']),  # 状态筛选优化
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.published_at:  # 自动设置为东八区当前时间
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def is_active(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time

    def approve(self): #管理员审核方法
        self.is_approved = True
        if not self.published_at:
            self.published_at = timezone.now()
        self.save()

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'cover': self.cover_image.url if self.cover_image else None,
            'status': {
                'code': self.status,
                'text': self.get_status_display(),
                'is_active': self.is_active
            },
            'time': {
                'start': self.start_time.isoformat(),
                'end': self.end_time.isoformat()
            }
        }



    @receiver(post_save, sender=CheckinRecord)
    def update_participant_count(sender, instance, created, **kwargs):
        if created:  # 只在新建记录时更新
            try:
                # 使用activity_id直接获取活动对象
                activity = Activity.objects.get(id=instance.activity_id)
                # 使用F()表达式原子性更新
                activity.current_participants = F('current_participants') + 1
                activity.save(update_fields=['current_participants'])
            except ObjectDoesNotExist:  # 使用Django通用异常
                logger.warning(f"Activity not found: {instance.activity_id}")

    # 在Activity模型中添加clean方法
    def clean(self):
        if 0 < self.max_participants < self.current_participants:
            raise ValidationError("当前参与人数不能超过最大限制")

        if self.start_time >= self.end_time:
            raise ValidationError("结束时间必须晚于开始时间")