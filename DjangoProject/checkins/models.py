# 导入Django的模型模块和自定义用户模型
from django.db import models
from login.models import User  # 从login应用导入自定义用户模型


# 定义打卡记录模型
class CheckinRecord(models.Model):
    # 外键关联用户模型（关键配置）
    # 修改后的外键关联（关键变化）
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='checkins',
        to_field='wx_openid',  # 指定关联字段
        db_column='wx_openid',  # 可选：自定义数据库列名
        verbose_name="关联用户"
    )
    # 活动信息存储（非外键方式）
    activity_id = models.PositiveIntegerField()  # 活动ID（正整数）
    activity_title = models.CharField(max_length=255)  # 活动名称（最大255字
    longitude = models.FloatField()  # 经度（浮点数，如：108.074）符）
    # 地理位置信息
    latitude = models.FloatField()  # 纬度（浮点数，如：34.291）
    address = models.TextField()  # 详细地址文本（支持长文本）
    # 多媒体信息
    photo_url = models.URLField()  # 图片URL（自动验证URL格式）
    # 时间信息
    timestamp = models.DateTimeField()  # 实际打卡时间（需前端传入）
    created_at = models.DateTimeField(auto_now_add=True)  # 记录创建时间（自动设置）

    class Meta:
        ordering = ['-created_at']  # 默认按创建时间倒序排列
        verbose_name = '打卡记录'  # 中文单数显示名称
        verbose_name_plural = '打卡记录'  # 中文复数显示名称

    def __str__(self):
        return f'{self.user.wx_openid} - {self.activity_title}'  # [!+++] 显示微信OpenID