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
from .models import CheckinRecord
from login.models import User  # 从login应用导入自定义用户模型
import pandas as pd
from django.http import JsonResponse
from django.http import HttpResponse
from activities.models import Activity

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

# 根据id返回用户所有打卡记录
class CheckinListView(APIView):
    # ====== 安全控制 ======

    authentication_classes = [JWTAuthentication]  # [!] 强制JWT认证
    permission_classes = [IsAuthenticated]  # [!] 仅允许登录用户访问

    def get(self, request):
        # 获取用户id，非学号
        user_id = request.user.user_id

        # if not user_id:
        #     return Response({"error": "缺少 userId 参数"}, status=status.HTTP_400_BAD_REQUEST)
        #
        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response({"error": "用户不存在"}, status=status.HTTP_404_NOT_FOUND)
        # 在打卡表中通过user查找，并通过时间排序
        checkins = CheckinRecord.objects.filter(user=user).order_by('created_at')
        serializer = CheckinRecordSerializer(checkins, many=True)
        data = {
            'status': 'success',
            'message': 'Checkins retrieved successfully',
            'checkins': []  # 这里可以添加实际的签到数据
        }
        data['checkins'] = serializer.data
        # return Response(serializer.data,data,status=status.HTTP_200_OK)
        return Response(data, status=status.HTTP_200_OK)

class CheckinPrint(APIView):
    # ====== 安全控制 ======

    authentication_classes = [JWTAuthentication]  # [!] 强制JWT认证
    permission_classes = [IsAuthenticated]  # [!] 仅允许登录用户访问
    def get(self, request):
        # print(request.user)
        # 进行权限检查，只有role为AD（管理员）非WX（普通用户）才能调用
        if request.user.role == 'AD':
            # 获取指定的活动id
            activity_id = request.query_params.get('actid')

            # 查询所有 activity_id 等于指定值的记录
            checkin_records = CheckinRecord.objects.filter(activity_id=activity_id)
            # 准备数据
            data = []
            for record in checkin_records:
                user = record.user
                if user:
                    data.append({
                        '姓名': user.last_name + user.first_name,  # 假设用户姓名存储在 first_name 和 last_name 字段中
                        '学号': user.student_id  # 假设学号存储在 username 字段中
                    })
                else:
                    data.append({
                        '姓名': '未知',
                        '学号': '未知'
                    })

            try:
                # 创建 DataFrame
                df = pd.DataFrame(data)

                # 导出到 Excel
                output_file = 'activity_report.xlsx'
                df.to_excel(output_file, index=False, sheet_name='参与者信息')

                print(f"成功导出 {len(data)} 条记录到 {output_file}")
                # 创建HTTP响应
                response = HttpResponse(
                    output_file,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = 'attachment; filename=activity_report.xlsx'
                response['Access-Control-Allow-Origin'] = '*'  # 允许跨域访问，微信小程序需要
                return response
            except Exception as e:
                # 返回错误响应
                print(str(e))
                return JsonResponse(
                    {
                        "success": False,
                        "message": f"导出失败: {str(e)}",  # 提示失败原因
                    },
                    status=500  # 服务器内部错误
                )
        else:
            return JsonResponse(
                {
                    "success": False,
                    "message": "没有权限查看活动记录"
                },
                status=403  # Forbidden
            )

class CheckinClass1Print(APIView):
    # ====== 安全控制 ======

    authentication_classes = [JWTAuthentication]  # [!] 强制JWT认证
    permission_classes = [IsAuthenticated]  # [!] 仅允许登录用户访问
    def get(self, request):
        # print(request.user)
        # 进行权限检查，只有role为AD（管理员）非WX（普通用户）才能调用
        if request.user.role == 'AD':
            # 1. 查询所有 activity_type='checkin' 的活动，并按时间排序
            dance_activities = Activity.objects.filter(
                activity_type='checkin'
            ).order_by('start_time')

            # 获取活动ID和时间列表
            activity_data = dance_activities.values_list('id', 'start_time')  # (活动ID, 活动时间)
            activity_ids = [item[0] for item in activity_data]
            activity_times = [item[1] for item in activity_data]

            # 2. 查询所有 role='wx' 的用户，并按学号排序
            wx_users = User.objects.filter(role='wx').order_by('student_id')

            # 3. 准备数据
            data = []
            for user in wx_users:
                user_data = {
                    '学号': user.student_id,
                    '姓名': user.last_name + user.first_name,
                }

                # 初始化所有活动的参与状态为 0
                for i, activity_id in enumerate(activity_ids):
                    user_data[f"{activity_times[i].strftime('%Y-%m-%d')}"] = 0  # 使用活动时间作为列名

                # 检查该用户是否参与了每个活动
                user_checkins = CheckinRecord.objects.filter(
                    user=user,
                    activity_id__in=activity_ids
                ).values_list('activity_id', flat=True)

                for activity_id in user_checkins:
                    if activity_id in activity_ids:
                        time_index = activity_ids.index(activity_id)
                        user_data[f"{activity_times[time_index].strftime('%Y-%m-%d')}"] = 1

                data.append(user_data)



            try:
                # 4. 转换为 DataFrame
                df = pd.DataFrame(data)

                # 5. 按学号排序
                df = df.sort_values(by='学号').reset_index(drop=True)

                # 6. 重新排列列顺序（学号、姓名、活动时间1、活动时间2...）
                columns = ['学号', '姓名'] + [col for col in df.columns if col not in ['学号', '姓名']]
                df = df[columns]

                # 导出到 Excel
                output_file = 'activity_report.xlsx'
                df.to_excel(output_file, index=False, sheet_name='活动参与信息')

                print(f"成功导出 {len(data)} 条记录到 {output_file}")
                # 创建HTTP响应
                response = HttpResponse(
                    output_file,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = 'attachment; filename=activity_report.xlsx'
                response['Access-Control-Allow-Origin'] = '*'  # 允许跨域访问，微信小程序需要
                return response
            except Exception as e:
                # 返回错误响应
                print(str(e))
                return JsonResponse(
                    {
                        "success": False,
                        "message": f"导出失败: {str(e)}",  # 提示失败原因
                    },
                    status=500  # 服务器内部错误
                )
        else:
            return JsonResponse(
                {
                    "success": False,
                    "message": "没有权限查看活动记录"
                },
                status=403  # Forbidden
            )
