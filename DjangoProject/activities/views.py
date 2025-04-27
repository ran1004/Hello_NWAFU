# activities/views.py
import os
import pprint
import uuid
from datetime import datetime

from django.core.files.storage import default_storage
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.contrib.auth import get_user_model
from django.db import models  # 添加这行
from activities.models import Activity

from activities.serializers import (
    ActivityListSerializer,
    ActivityDetailSerializer,
    ActivityCreateSerializer
)
from activities.permissions import IsAdminUser  # 导入自定义权限

User = get_user_model()

# activities/views.py
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.translation import gettext_lazy as _


class ActivityListView(generics.ListAPIView):
    """
    活动列表视图（纯数据提供版）
    响应格式：
    {
        "code": 200,
        "message": "success",
        "data": [活动列表数组]
    }
    """
    serializer_class = ActivityListSerializer
    permission_classes = [permissions.AllowAny]

    # 只需返回所有活跃活动，无需过滤
    queryset = Activity.objects.order_by('-published_at')

    def list(self, request, *args, **kwargs):
        """重写list方法，返回统一格式"""
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)

            return Response({
                "code": 200,
                "message": _("success"),
                "data": serializer.data  # 直接返回数组
            })

        except Exception as e:
            return Response({
                "code": 500,
                "message": _("Server error: ") + str(e),
                "data": None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActivityDetailView(generics.RetrieveAPIView):
    queryset = Activity.objects.all()
    serializer_class = ActivityDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'id'

    @method_decorator(cache_page(60))
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context

    def retrieve(self, request, *args, **kwargs):
        # 先获取原始响应
        response = super().retrieve(request, *args, **kwargs)

        # 打印调试信息
        print("\n===== 即将返回给前端的数据 ======")
        print("HTTP状态码:", response.status_code)
        print("数据类型:", type(response.data))
        print("数据内容:")
        pprint.pprint(response.data)  # 使用pprint美化输出
        print("=" * 40 + "\n")

        return response


class ActivityCreateView(generics.CreateAPIView):
    """
    创建活动视图 - 仅管理员(AD)可用
    """
    queryset = Activity.objects.all()
    serializer_class = ActivityCreateSerializer
    permission_classes = [IsAdminUser]  # 使用自定义权限

    def perform_create(self, serializer):
        """创建时自动设置创建者"""
        serializer.save(creator=self.request.user)

    def create(self, request, *args, **kwargs):
        """重写create方法以返回更详细的响应"""
        # 检查用户权限

        print("🔥 接收数据:", request.data)  # 调试日志
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("❌ 验证失败详情:", serializer.errors)  # 关键调试信息
            return Response(
                {
                    "code": 400,
                    "message": "数据验证失败",
                    "errors": serializer.errors  # 返回具体错误
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        if not request.user.is_authenticated:
            print("⚠️ 未认证用户尝试创建活动")  # 打印到控制台
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.user.role != 'AD':
            print(f"❌ 非管理员用户尝试创建活动，用户ID: {request.user.id}, 角色: {request.user.role}")  # 打印详细信息
            return Response(
                {"detail": "Only admin users can create activities."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # 返回创建的活动详情
        activity = Activity.objects.get(id=serializer.data['id'])
        detail_serializer = ActivityDetailSerializer(activity, context={'request': request})


        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )




class ImageUploadView(APIView):
    """处理微信小程序图片上传"""
    permission_classes = [permissions.IsAuthenticated]  # 需要登录
    def post(self, request):
        # 1. 验证文件存在
        if 'file' not in request.FILES:
            return Response(
                {"code": 400, "message": "未接收到文件"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']

        # 2. 验证文件类型
        valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in valid_extensions:
            return Response(
                {"code": 400, "message": "仅支持JPG/PNG/WEBP格式"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. 验证文件大小（5MB限制）
        max_size = 5 * 1024 * 1024  # 5MB
        if uploaded_file.size > max_size:
            return Response(
                {"code": 400, "message": "文件大小不能超过5MB"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. 生成唯一文件名
        file_name = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex}{ext}"
        save_path = os.path.join('activity_images', file_name)

        # 5. 保存文件
        try:
            saved_path = default_storage.save(save_path, uploaded_file)
            file_url = default_storage.url(saved_path)

            return Response({
                "code": 200,
                "message": "上传成功",
                "url": file_url,  # 相对路径（如 /media/activity_images/xxx.jpg）
                "absolute_url": request.build_absolute_uri(file_url)  # 完整URL
            })

        except Exception as e:
            return Response(
                {"code": 500, "message": f"文件保存失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )