# 导入DRF核心模块
from rest_framework.views import APIView         # 基础API视图类
from rest_framework.response import Response     # 响应构造器
from rest_framework import status                # HTTP状态码常量
from rest_framework.permissions import IsAuthenticated  # 认证权限控制
from myutils import JWTAuthentication              # 自定义JWT认证类
from .serializers import CheckinRecordSerializer # 数据序列化器

# 打卡提交视图（核心业务逻辑）
class CheckinSubmitView(APIView):
    # ====== 安全控制 ======
    authentication_classes = [JWTAuthentication]  # [!] 强制JWT认证
    permission_classes = [IsAuthenticated]        # [!] 仅允许登录用户访问

    # ====== POST请求处理 ======
    def post(self, request):
        print("通过认证----开始提交打卡数据")
        """处理带微信OpenID关联的打卡提交"""
        # 在视图中打印认证信息
        print(request.data)
        print(request.user)  # 显示认证后的用户对象
        print(request.auth)  # 显示认证载荷(payload)
        print(request.user.is_authenticated)  # 检查权限判断依据
        # 初始化序列化器（关键数据入口）
        serializer = CheckinRecordSerializer(
            data=request.data,                   # 原始请求数据
            context={'request': request}         # [!] 注入请求上下文
        )
        # 数据验证与处理
        if serializer.is_valid():                # 触发完整验证流程
            print("开始验证数据")
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