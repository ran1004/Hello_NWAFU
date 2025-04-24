# admin.py
from django.contrib import admin
from .models import User  # 导入你的用户模型


@admin.register(User)  # 注册模型到后台
class UserAdmin(admin.ModelAdmin):
    # 配置列表页显示字段
    list_display = ('user_id', 'student_id', 'name', 'gender', 'college')

    # 配置右侧过滤器
    list_filter = ('role', 'gender', 'college')

    # 配置搜索字段
    search_fields = ('student_id', 'name')

    # 配置表单页字段分组
    fieldsets = (
        ('基本信息', {
            'fields': ('student_id', 'name', 'gender')
        }),
        ('学业信息', {
            'fields': ('class_name', 'college', 'major')
        }),
        ('权限信息', {
            'fields': ('role', 'wx_openid')
        })
    )