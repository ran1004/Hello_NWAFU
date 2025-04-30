# activities/views.py
import os
import pprint
import uuid
from datetime import datetime
from django.utils import timezone
from django.core.files.base import ContentFile
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
    def get_queryset(self):
        """重写get_queryset方法，过滤未发布的活动"""
        now = timezone.now()
        return Activity.objects.filter(
            published_at__lte=now  # 只返回published_at <= 当前时间的活动
        ).order_by('-published_at')

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
    创建活动视图 - 仅管理员(AD)可用（增加图片移动功能）
    """
    queryset = Activity.objects.all()
    serializer_class = ActivityCreateSerializer
    permission_classes = [IsAdminUser]

    def move_temp_image(self, temp_url, activity_id):
        """将临时图片移动到活动专属目录"""
        if not temp_url or not default_storage.exists(temp_url):
            return None

        try:
            # 获取文件名并构建新路径
            filename = os.path.basename(temp_url)
            new_dir = f"activity_images/act_{activity_id}"
            new_path = os.path.join(new_dir, filename)

            # 确保目录存在
            if not default_storage.exists(new_dir):
                default_storage.save(new_dir + '/.keep', ContentFile(''))

            # 移动文件
            with default_storage.open(temp_url, 'rb') as old_file:
                default_storage.save(new_path, old_file)
            default_storage.delete(temp_url)

            return new_path
        except Exception as e:
            print(f"⚠️ 图片移动失败: {str(e)}")
            return None

    def perform_create(self, serializer):
        """创建时自动设置创建者"""
        activity = serializer.save(creator=self.request.user)

        # 移动封面图（如果存在）
        if 'cover_image' in serializer.validated_data:
            temp_url = serializer.validated_data['cover_image']
            new_path = self.move_temp_image(temp_url, activity.id)
            if new_path:
                activity.cover_image = new_path
                activity.save(update_fields=['cover_image'])

        # 移动活动图片（如果存在）
        if 'image_gallery' in serializer.validated_data:
            new_gallery = []
            for temp_url in serializer.validated_data['image_gallery']:
                new_path = self.move_temp_image(temp_url, activity.id)
                if new_path:
                    new_gallery.append(new_path)
            if new_gallery:
                activity.image_gallery = new_gallery
                activity.save(update_fields=['image_gallery'])

    def create(self, request, *args, **kwargs):
        """重写create方法以处理图片移动"""
        print("🔥 接收数据:", request.data)

        # 权限检查
        if not request.user.is_authenticated:
            print("⚠️ 未认证用户尝试创建活动")
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if request.user.role != 'AD':
            print(f"❌ 非管理员用户尝试创建活动，用户ID: {request.user.id}, 角色: {request.user.role}")
            return Response(
                {"detail": "Only admin users can create activities."},
                status=status.HTTP_403_FORBIDDEN
            )

        # 数据验证
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("❌ 验证失败详情:", serializer.errors)
            return Response(
                {
                    "code": 400,
                    "message": "数据验证失败",
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            # 返回创建的活动详情
            activity = Activity.objects.get(id=serializer.data['id'])
            detail_serializer = ActivityDetailSerializer(activity, context={'request': request})

            return Response(
                detail_serializer.data,
                status=status.HTTP_201_CREATED,
                headers=self.get_success_headers(serializer.data)
            )
        except Exception as e:
            print(f"❌ 活动创建异常: {str(e)}")
            return Response(
                {
                    "code": 500,
                    "message": "活动创建过程中发生错误",
                    "detail": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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

        # 4. 生成唯一文件名 先存放到临时文件夹
        file_name = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex}{ext}"
        save_path = os.path.join('temp_images', file_name)

        # 5. 保存文件
        try:
            saved_path = default_storage.save(save_path, uploaded_file)
            print(f"-----save path: {saved_path}")
            return Response({
                "code": 200,
                "message": "上传成功",
                "temp_url": saved_path,  # temp_images/..
                "temp_absolute_url": request.build_absolute_uri(f'/media/{saved_path}')  # 完整URL
            })

        except Exception as e:
            return Response(
                {"code": 500, "message": f"文件保存失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )