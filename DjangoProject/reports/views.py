from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .models import ExportTemplate
from .services import ReportExporter
from activities.models import Activity
from checkins2.models import CheckinRecord


class ExportCheckinData(APIView):
    """
    打卡数据导出视图
    支持功能：
    - 按活动ID导出数据
    - 支持Excel/CSV格式
    - 支持使用预存模板
    - 权限验证
    """

    def get(self, request, activity_id):
        """
        处理GET请求
        :param request: HTTP请求对象
        :param activity_id: 活动ID
        :return: 文件下载响应
        """
        try:
            # 1. 验证活动存在性
            activity = Activity.objects.get(pk=activity_id)

            # 2. 验证用户权限（必须是活动创建者或超级用户）
            if not (request.user == activity.created_by or request.user.is_superuser):
                return Response(
                    {"error": "无权导出该活动数据"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # 3. 获取查询参数
            export_format = request.query_params.get('format', 'excel').lower()
            template_id = request.query_params.get('template')

            # 4. 获取打卡记录
            records = CheckinRecord.objects.filter(activity=activity)

            # 5. 应用模板（如果指定）
            template = None
            if template_id:
                template = ExportTemplate.objects.get(
                    pk=template_id,
                    created_by=request.user
                )
                # 可在此处添加模板与活动匹配的验证

            # 6. 调用服务类生成文件
            if export_format == 'excel':
                output = ReportExporter.export_to_excel(records, template=template)
                content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                file_ext = 'xlsx'
            else:
                output = ReportExporter.export_to_csv(records, template=template)
                content_type = 'text/csv'
                file_ext = 'csv'

            # 7. 构建响应
            filename = f"{template.name}.{file_ext}" if template else f"activity_{activity_id}_checkins.{file_ext}"
            response = HttpResponse(
                output.getvalue(),
                content_type=content_type
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except Activity.DoesNotExist:
            return Response(
                {"error": "活动不存在"},
                status=status.HTTP_404_NOT_FOUND
            )
        except ExportTemplate.DoesNotExist:
            return Response(
                {"error": "模板不存在或无权访问"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"导出失败: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExportTemplateListCreateView(APIView):
    """
    模板列表获取与创建
    """

    def get(self, request):
        """获取当前用户的模板列表"""
        templates = ExportTemplate.objects.filter(created_by=request.user)
        serializer = ExportTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    def post(self, request):
        """创建新模板"""
        serializer = ExportTemplateSerializer(data=request.data)
        if serializer.is_valid():
            # 验证活动所有权
            activity = serializer.validated_data['activity']
            if activity.created_by != request.user:
                return Response(
                    {"error": "无权为该活动创建模板"},
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ExportTemplateDetailView(APIView):
    """
    模板详情获取、更新与删除
    """

    def get_object(self, pk, user):
        try:
            return ExportTemplate.objects.get(pk=pk, created_by=user)
        except ExportTemplate.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        """获取模板详情"""
        template = self.get_object(pk, request.user)
        serializer = ExportTemplateSerializer(template)
        return Response(serializer.data)

    def put(self, request, pk):
        """更新模板"""
        template = self.get_object(pk, request.user)
        serializer = ExportTemplateSerializer(template, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """删除模板"""
        template = self.get_object(pk, request.user)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)