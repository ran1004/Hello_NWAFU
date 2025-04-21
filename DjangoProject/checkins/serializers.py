# checkins/serializers.py

# 这是一个基于 Django REST Framework (DRF) 的序列化器模块，
# 用于将 User 和 Checkin 模型的数据转换为 JSON 格式（或其他可传输格式），以便在 API 中进行数据交互

from rest_framework import serializers
from .models import Checkin
from django.contrib.auth.models import User

#将 User 模型的数据序列化为 JSON
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User #绑定到 Django 内置的 User 模型。
        fields = ['id', 'username'] #仅序列化 id 和 username 字段，其他字段（如密码、邮箱）将被忽略。

#将 Checkin 模型的数据序列化为 JSON，并嵌套序列化关联的用户信息
class CheckinSerializer(serializers.ModelSerializer):

    user = UserSerializer(read_only=True)  # 嵌套序列化Checkin模型中user字段，外键关联到 User 模型
    #read_only=True表示该字段仅用于序列化输出（前端展示），不可通过 API 请求直接修改

    class Meta:
        model = Checkin
        fields = ['id', 'user', 'checkin_time']