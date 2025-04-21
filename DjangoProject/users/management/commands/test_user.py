# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from users.models import Student

class Command(BaseCommand):  # 必须继承 BaseCommand 并命名为 Command
    help = '创建测试学生用户'  # 命令描述（可选）

    def handle(self, *args, **options):
        student = Student.objects.create_user(
            student_id='2024056233',
            password='mypassword',
            name='tt',
            class_name='计算机1班'
        )
        self.stdout.write(f'成功创建学生: {student.student_id}')