# 导入DRF的序列化器模块和当前应用的模型
from rest_framework import serializers
from .models import CheckinRecord
from django.utils import timezone
from datetime import datetime
import pytz  # 需要安装：pip install pytz
# 定义打卡记录序列化器
class CheckinRecordSerializer(serializers.ModelSerializer):
    # 定义两个只写JSON字段（核心功能入口）
    activity = serializers.JSONField(write_only=True)  # 接收活动信息的嵌套对象
    record = serializers.JSONField(write_only=True)    # 接收打卡记录的嵌套对象

    class Meta:
        model = CheckinRecord
        fields = ['activity', 'record']  # 指定暴露的字段（非模型直接字段）

    # 自定义验证方法（数据清洗中枢）
    def validate(self, data):
        # 增强验证逻辑
        if 'activity' not in data or 'record' not in data:
            raise serializers.ValidationError("请求体结构错误")

        activity = data['activity']
        record = data['record']

        # 活动信息验证---
        if not all(key in activity for key in ['id', 'title']):
            raise serializers.ValidationError({"activity": "缺少必要字段"})

        # 记录信息验证
        required_fields = ['photo_url', 'latitude', 'longitude', 'address', 'timestamp']
        missing = [field for field in required_fields if field not in record]
        if missing:
            raise serializers.ValidationError({"record": f"缺少字段: {', '.join(missing)}"})
        # 新增：验证 photo_url 格式
        photo_url = record.get('photo_url')
        if not photo_url.startswith(('http://', 'https://')):
            raise serializers.ValidationError({"photo_url": "无效的图片URL"})
        # 解析时间字符串并转换时区
        try:
            timestamp_str = data['record']['timestamp']

            # 处理带 'Z' 的 UTC 时间字符串
            if 'Z' in timestamp_str:
                # 替换 'Z' 为 '+00:00' 以便解析
                normalized_str = timestamp_str.replace('Z', '+00:00')
                naive_time = datetime.fromisoformat(normalized_str)
                utc_time = naive_time.replace(tzinfo=pytz.UTC)
                # 转换为本地时区（如 Asia/Shanghai）
                local_time = utc_time.astimezone(timezone.get_current_timezone())
            else:
                # 假定时间字符串已经是本地时间（无时区信息）
                naive_time = datetime.fromisoformat(timestamp_str)
                local_time = timezone.make_aware(naive_time, timezone.get_current_timezone())
            print("本地时间:",local_time)
            # 更新记录中的时间字段
            data['record']['timestamp'] = local_time
        except (KeyError, ValueError) as e:
            raise serializers.ValidationError({"timestamp": "时间格式错误，示例：2025-04-23T09:57:51Z"})
        # 数据重组，将JSON对象平铺为数据库模型对象
        validated_data = {
            'activity_id': activity['id'],
            'activity_title': activity['title'],
            ** record  # 这里record中的timestamp已被转换为datetime对象
        }
        return validated_data

    def create(self, validated_data):
        #关键修改：直接使用通过认证的用户对象
        return CheckinRecord.objects.create(
            user=self.context['request'].user,
         ** validated_data
        )

    def to_representation(self, instance):
        """返回本地时区时间"""
        local_time = instance.timestamp.astimezone(timezone.get_current_timezone())
        return {
            'activity_title': instance.activity_title,
            'timestamp': local_time.isoformat()
        }