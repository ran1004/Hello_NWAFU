from openpyxl import Workbook
from io import BytesIO
import csv
from django.http import HttpResponse
from checkins2.models import CheckinRecord


class ReportExporter:
    """高级报表导出服务类"""

    @staticmethod
    def export_to_excel(records, fields=None, template=None):
        """Excel导出高级实现"""
        wb = Workbook()
        ws = wb.active

        # 使用模板或默认配置
        if template:
            fields = template.fields
            ws.title = template.name
        else:
            fields = fields or ['real_name', 'student_id', 'checkin_time', 'content', 'status']
            ws.title = "打卡记录"

        # 生成表头
        headers = ReportExporter._generate_headers(fields)
        ws.append(headers)

        # 填充数据
        for record in records:
            row = ReportExporter._generate_row(record, fields)
            ws.append(row)

        # 保存到内存
        output = BytesIO()
        wb.save(output)
        return output

    @staticmethod
    def export_to_csv(records, fields=None, template=None):
        """CSV导出高级实现"""
        output = StringIO()
        writer = csv.writer(output)

        fields = fields or ['real_name', 'student_id', 'checkin_time', 'content', 'status']

        # 写入表头
        headers = ReportExporter._generate_headers(fields)
        writer.writerow(headers)

        # 写入数据
        for record in records:
            row = ReportExporter._generate_row(record, fields)
            writer.writerow(row)

        return output

    @staticmethod
    def _generate_headers(fields):
        """生成表头"""
        field_mapping = {
            'real_name': '姓名',
            'student_id': '学号',
            'checkin_time': '打卡时间',
            'content': '打卡内容',
            'status': '状态'
        }
        return [field_mapping.get(field, field) for field in fields]

    @staticmethod
    def _generate_row(record, fields):
        """生成数据行"""
        row = []
        for field in fields:
            if field == 'real_name':
                row.append(record.user.real_name)
            elif field == 'student_id':
                row.append(record.user.student_id)
            elif field == 'checkin_time':
                row.append(record.checkin_time.strftime('%Y-%m-%d %H:%M'))
            elif field == 'content':
                row.append(record.content)
            elif field == 'status':
                row.append('有效' if record.is_valid else '无效')
            else:
                row.append('')
        return row