from rest_framework import serializers
from .models import ExportTemplate

class ExportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportTemplate
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at')