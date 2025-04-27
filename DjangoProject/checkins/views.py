# 导入DRF核心模块
import os
import uuid

from rest_framework.views import APIView         # 基础API视图类
from rest_framework.response import Response     # 响应构造器
from rest_framework import status                # HTTP状态码常量
from rest_framework.permissions import IsAuthenticated  # 认证权限控制
from myutils import JWTAuthentication              # 自定义JWT认证类
from .serializers import CheckinRecordSerializer # 数据序列化器
from rest_framework.parsers import MultiPartParser, JSONParser
from django.core.files.storage import FileSystemStorage  # [!] 新增文件存储模块
from django.utils import timezone
# 打卡提交视图（核心业务逻辑）
class CheckinSubmitView(APIView):
    # ====== 安全控制 ======
    authentication_classes = [JWTAuthentication]  # [!] 强制JWT认证
    permission_classes = [IsAuthenticated]        # [!] 仅允许登录用户访问

    # ====== POST请求处理 ======
    def post(self, request):
        print("提交打卡数据")
        """处理带微信OpenID关联的打卡提交"""
        # 在视图中打印认证信息
        # 初始化序列化器（关键数据入口）
        serializer = CheckinRecordSerializer(
            data=request.data,                   # 原始请求数据
            context={'request': request}         # [!] 注入请求上下文
        )
        # 数据验证与处理
        if serializer.is_valid():                # 触发完整验证流程
            # 数据持久化（核心操作）
            serializer.save()                 # 调用序列化器的create方法
            print("数据保存成功")
            # 成功响应（符合企业级规范）
            return Response({
                "code": 0,                      # 业务状态码
                "message": "打卡成功",           # 人性化提示
                "data": {                        # 核心返回数据
                    "wx_openid": request.user.wx_openid,  # [!] 返回用户标识
                    "activity":  serializer.instance.activity_title,  # 活动名称
                }
            }, status=status.HTTP_201_CREATED)   # RESTful状态码

        # 错误处理（防御式编程）
        return Response({
            "code": 400,                        # 错误状态码
            "message": "验证失败",               # 失败原因概要
            "errors": serializer.errors         # [!] 详细错误清单
        }, status=status.HTTP_400_BAD_REQUEST)  # 客户端错误状态码


class PhotoUploadView(APIView):
    """处理图片上传的独立视图类（新增功能）"""
    authentication_classes = [JWTAuthentication]  # 复用原有JWT认证
    permission_classes = [IsAuthenticated]  # 仅允许登录用户上传
    parser_classes = [MultiPartParser]  # [!] 关键：允许文件上传格式

    def post(self, request):
        """处理图片上传逻辑"""
        # --- 验证文件存在性 ---
        print("图片进行上传")
        # 从 request.POST 获取普通表单字段
        activity_id = request.POST.get('activity_id')  # [!] 关键修改
        if not activity_id:
            return Response(
                {"code": 400, "message": "缺少活动ID"},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 获取用户信息（通过JWT认证）
        user = request.user
        user_id = user.student_id  # 根据实际模型字段调整
        user_name=user.name
        if 'photo' not in request.FILES:
            return Response(
                {"code": 400, "message": "未上传图片文件"},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['photo']
        # --- 文件类型验证（示例允许jpg/png）---
        allowed_types = ['image/jpeg', 'image/png']
        if uploaded_file.content_type not in allowed_types:
            return Response(
                {"code": 400, "message": "仅支持JPG/PNG格式"},
                status=status.HTTP_400_BAD_REQUEST
            )
        # --- 文件大小限制（示例5MB）---
        max_size = 5 * 1024 * 1024
        if uploaded_file.size > max_size:
            return Response(
                {"code": 400, "message": "文件超过5MB限制"},
                status=status.HTTP_400_BAD_REQUEST
            )
        # --- 生成自定义文件名 ---
        # 提取文件扩展名
        file_ext = os.path.splitext(uploaded_file.name)[1]  # 如 .jpg
        # 生成唯一标识（避免重名）
        unique_id = uuid.uuid4().hex[:8]  # 取前8位
        local_time = timezone.localtime(timezone.now())
        timestamp = local_time.strftime("%Y-%m-%d_%H-%M-%S")
        # 组合新文件名
        new_filename = f"check/aid{activity_id}/uid{user_id}_name{user_name}_time{timestamp}_{unique_id}{file_ext}"
        # --- 存储文件 ---
        fs = FileSystemStorage()
        filename = fs.save(new_filename, uploaded_file)  # [!] 关键：使用新文件名
        photo_url = request.build_absolute_uri(fs.url(filename))
        print("图片上传成功")
        print(photo_url)
        return Response({
            "code": 0,
            "data": {"photo_url": photo_url}
        }, status=status.HTTP_200_OK)
