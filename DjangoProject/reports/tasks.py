# reports/tasks.py
from celery import shared_task
from .services import ReportExporter
from django.core.mail import EmailMessage
from django.conf import settings


@shared_task
def async_export_report(user_id, activity_id, format, template_id=None):
    from accounts.models import User
    from activity.models import Activity

    user = User.objects.get(pk=user_id)
    activity = Activity.objects.get(pk=activity_id)
    records = CheckinRecord.objects.filter(activity=activity)

    if template_id:by=user)
    else:
        template = ExportTemplate.objects.get(pk=template_id, created_
        template = None

    if format == 'excel':
        output = ReportExporter.export_to_excel(records, template=template)
        content_type = 'application/ms-excel'
        ext = 'xlsx'
    else:
        output = ReportExporter.export_to_csv(records, template=template)
        content_type = 'text/csv'
        ext = 'csv'

    filename = (template.name if template else 'checkin_records') + f'.{ext}'

    # 保存到临时文件或直接发送邮件
    email = EmailMessage(
        subject=f'您的导出报表: {filename}',
        body='附件是您请求导出的报表文件',
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email]
    )
    email.attach(filename, output.getvalue(), content_type)
    email.send()