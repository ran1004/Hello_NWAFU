# students/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Student


class StudentAdmin(UserAdmin):
    filter_horizontal = ()
    ordering = ('student_id',)
    list_display = ('student_id', 'name', 'class_name', 'is_active')
    search_fields = ('student_id', 'name')
    list_filter = ('class_name', 'grade', 'is_active')

    fieldsets = (
        (None, {'fields': ('student_id', 'password')}),
        ('个人信息', {'fields': ('name', 'class_name', 'grade', 'major', 'phone')}),
        ('权限', {'fields': ('is_active', 'is_admin')}),
    )

    # 新增用户时必填字段
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('student_id', 'name', 'password1', 'password2'),
        }),
    )


admin.site.register(Student, StudentAdmin)