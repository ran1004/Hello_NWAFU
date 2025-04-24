# serializers.py
from rest_framework import serializers
from .models import Activity

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ['id', 'publisher', 'title', 'content', 'activity_time', 'created_at']