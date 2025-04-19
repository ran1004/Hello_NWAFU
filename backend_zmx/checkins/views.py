# checkins/views.py

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Checkin
from .serializers import CheckinSerializer
from datetime import datetime, timedelta

User = get_user_model()


class CheckinListView(APIView):
    def get(self, request):
        user_id = request.query_params.get('userId')
        time_range = request.query_params.get('timeRange', 'week')

        if not user_id:
            return Response({"error": "缺少 userId 参数"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "用户不存在"}, status=status.HTTP_404_NOT_FOUND)

        # 确定时间范围并查询打卡记录，目前不用，因为根据userID返回全部打卡记录
        now = datetime.now()
        if time_range == 'week':
            start_time = now - timedelta(days=now.weekday() + 7)
            end_time = start_time + timedelta(days=7)
        elif time_range == 'month':
            start_time = now.replace(day=1) - timedelta(days=now.day)
            next_month = now.replace(day=28) + timedelta(days=4)
            end_time = next_month.replace(day=1) - timedelta(days=1)
        else:
            return Response({"error": "无效的 timeRange 参数，支持 'week' 或 'month'"}, status=status.HTTP_400_BAD_REQUEST)

        # checkins = Checkin.objects.filter(user=user, checkin_time__gte=start_time, checkin_time__lt=end_time).order_by(
        #     'checkin_time')
        checkins = Checkin.objects.filter(user=user).order_by('checkin_time')
        serializer = CheckinSerializer(checkins, many=True)
        data = {
            'status': 'success',
            'message': 'Checkins retrieved successfully',
            'checkins': []  # 这里可以添加实际的签到数据
        }
        data['checkins'] = serializer.data
        # return Response(serializer.data,data,status=status.HTTP_200_OK)
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"error": "缺少 username 或 password 参数"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # 检查用户是否已存在
            user, created = User.objects.get_or_create(username=username)

            # 如果用户已存在，可以选择不设置密码或采取其他措施
            if not created:
                return Response({"error": f"用户 '{username}' 已存在"}, status=status.HTTP_409_CONFLICT)

            user.set_password(password)
            user.save()

            return Response({"message": f"用户 '{username}' 创建成功"}, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)