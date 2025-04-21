# models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class StudentManager(BaseUserManager):
    def create_user(self, student_id, password=None, **extra_fields):
        if not student_id:
            raise ValueError('学号必须填写')
        student = self.model(student_id=student_id, **extra_fields)
        student.set_password(password)
        student.save()
        return student


class Student(AbstractBaseUser):
    student_id = models.CharField(max_length=20, unique=True)  # 学号作为用户名
    name = models.CharField(max_length=50)  # 姓名
    class_name = models.CharField(max_length=50)  # 班级
    grade = models.CharField(max_length=10)  # 年级
    major = models.CharField(max_length=50)  # 专业
    phone = models.CharField(max_length=15, blank=True)  # 联系方式
    is_active = models.BooleanField(default=True)  # 账户是否激活
    is_admin = models.BooleanField(default=False)  # 管理员标识

    objects = StudentManager()

    USERNAME_FIELD = 'student_id'  # 指定登录字段
    REQUIRED_FIELDS = ['name', 'class_name']  # 创建超级用户时的必填字段


class CheckinRecord(models.Model):
    student = models.ForeignKey(  # 关联自定义用户表
        'Student',
        on_delete=models.CASCADE,
        related_name='checkins'
    )
    checkin_time = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=False)  # True表示在范围内，False表示不在

    def __str__(self):
        return f"{self.student_id} - {self.name}"
