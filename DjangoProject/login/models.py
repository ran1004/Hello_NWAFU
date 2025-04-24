from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):  # 继承Django默认用户模型
    """
    用户模型（包含自增主键和完整字段约束）
    """
    # 性别选项（数据库存储值：M-男，F-女）
    GENDER_CHOICES = (
        ('M', '男'),
        ('F', '女'),
    )
    WX_USER = 'WX'  # 常量定义：微信用户类型
    ADMIN = 'AD'  # 常量定义：管理员类型
    ROLE_CHOICES = [  # 角色选项配置
        (WX_USER, '微信用户'),
        (ADMIN, '管理员')
    ]
    # 添加以下配置解决冲突
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='用户所属的组',
        related_name="login_user_groups",  # 关键修改
        related_query_name="user",
    )

    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='用户权限',
        blank=True,
        help_text='用户特定的权限',
        related_name="login_user_permissions",  # 关键修改
        related_query_name="user",
    )
    # 覆盖默认字段并扩展
    # 主键字段（自增）
    user_id = models.AutoField( primary_key=True,verbose_name="用户ID")
    student_id = models.CharField(max_length=20, unique=True, verbose_name="学号")  # 学号唯一约束
    name = models.CharField(max_length=50, verbose_name="姓名")
    wx_openid = models.CharField(max_length=100, unique=True, null=True, blank=True,verbose_name="微信唯一标识")# 微信唯一标识
    role = models.CharField(max_length=2, choices=ROLE_CHOICES, default=WX_USER,verbose_name="角色权限")
    avatar = models.ImageField(upload_to='avatars/', null=True,verbose_name="头像路径")  # 头像文件存储路径
    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        verbose_name="性别"
    )
    # 班级信息（直接存储）
    class_name = models.CharField(
        max_length=100,
        verbose_name="班级名称"
    )

    college = models.CharField(
        max_length=100,
        verbose_name="学院"
    )

    major = models.CharField(
        max_length=100,
        verbose_name="专业"
    )
    # 自动记录创建时间
    create_time = models.DateTimeField(
        auto_now_add=True,
        verbose_name="创建时间"
    )

    # 替换认证主键为学号
    USERNAME_FIELD = 'student_id'  # 使用学号作为登录凭证
    def __str__(self):
        return f"{self.name} ({self.student_id})"

    class Meta:
        verbose_name = "用户"
        verbose_name_plural = "用户列表"
        db_table = "user"  # 自定义表名
        ordering = ['-create_time']  # 默认按创建时间倒序排列

class TempToken(models.Model):  # 临时令牌模型
    token = models.CharField(max_length=64, primary_key=True)  # SHA256生成
    wx_code = models.CharField(max_length=100)  # 微信临时code存储
    session_key = models.CharField(max_length=100)  # 关联的会话密钥
    openid = models.CharField(max_length=100)  # 关联的用户openid
    created_at = models.DateTimeField(auto_now_add=True)  # 创建时间

class WechatUser(models.Model):
    openid = models.CharField(max_length=64, unique=True)
    session_key = models.CharField(max_length=64)
    nickname = models.CharField(max_length=64, blank=True)
    avatar = models.URLField(max_length=256, blank=True)
    last_login = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'login'  # 显式声明所属应用
        indexes = [
            models.Index(fields=['openid']),
            models.Index(fields=['created_at'])
        ]