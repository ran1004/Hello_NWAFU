# activities/serializers.py
from django.utils.timezone import now
from rest_framework import serializers
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from activities.models import Activity
import pytz



class ActivityListSerializer(serializers.ModelSerializer):
    """列表页极简字段"""
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id',
            'title',
            'cover_url',
            'start_time',
            'end_time',
            'location_name'
        ]

    def get_cover_url(self, obj):
        """生成封面图完整URL"""
        if obj.cover_image and obj.cover_image.url:
            url = obj.cover_image.url
            request = self.context.get('request')
            final_url = request.build_absolute_uri(url) if request else url
            return final_url
        return None


class ActivityDetailSerializer(serializers.ModelSerializer):
    """详情页完整字段"""
    cover_url = serializers.SerializerMethodField()  # 需要显式声明
    image_urls = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id',
            'title',
            'creator_id',
            'content',
            'start_time',
            'end_time',
            'location_name',
            'cover_url',  # 由get_cover_url方法生成
            'image_urls'  # 由get_image_urls方法生成
        ]
        # 修正read_only_fields（只包含模型原生字段）
        read_only_fields = [
            'id',
            'title',
            'content',
            'start_time',
            'end_time',
            'location_name'
        ]

    def get_cover_url(self, obj):
        """生成封面图完整URL"""
        if obj.cover_image and obj.cover_image.url:
            url = obj.cover_image.url
            request = self.context.get('request')
            final_url = request.build_absolute_uri(url) if request else url
            return final_url
        return None

    def get_image_urls(self, obj):
        """处理图集URL列表"""
        if not obj.image_gallery:
            return []

        request = self.context.get('request')
        return [
            request.build_absolute_uri(url) if (request and url) else url
            for url in obj.image_gallery
        ]


class ActivityCreateSerializer(serializers.ModelSerializer):
    # 可选字段显式声明（确保接收空值）
    location_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    cover_image = serializers.CharField(
        required=False,
        allow_blank=True,
        default='activity_images/avatar.webp'  # 默认图片路径
    )
    image_gallery = serializers.JSONField(
        required=False,
        default=list
    )

    class Meta:
        model = Activity
        fields = [
            'id',
            'title',
            'content',
            'published_at',  # 允许手动设置发布时间
            'start_time',
            'end_time',
            'location_name',
            'cover_image',
            'image_gallery'
        ]
        extra_kwargs = {
            'published_at': {'required': False}  # 不传则自动设置
        }

    def validate(self, data):
        """全局验证逻辑"""
        # 自动设置发布时间（如果未提供）
        # 调试点1：检查输入数据

        if not data.get('published_at'):
            beijing_time = timezone.now().astimezone(pytz.timezone('Asia/Shanghai'))
            data['published_at'] = beijing_time

        # 时间顺序验证
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("结束时间必须晚于开始时间")

        # 图片集格式验证
        if 'image_gallery' in data and not isinstance(data['image_gallery'], list):
            raise serializers.ValidationError("图片集必须是URL列表")

        return data

    def create(self, validated_data):
        """创建时自动关联当前用户"""
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)