# activities/permissions.py
from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    自定义权限：只允许管理员(AD)创建活动
    基于你的角色定义: WX_USER = 'WX', ADMIN = 'AD'
    """

    def has_permission(self, request, view):
        # 检查用户是否认证
        if not request.user.is_authenticated:
            return False

        # 检查用户角色是否为管理员(AD)
        return getattr(request.user, 'role', None) == 'AD'