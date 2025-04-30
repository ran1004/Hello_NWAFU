from django.core.management.base import BaseCommand
from django.utils import timezone
from activities.models import Activity
from datetime import timedelta


class Command(BaseCommand):
    help = '删除超过1个月的过期活动'

    def handle(self, *args, **options):
        # 计算1个月前的时间
        one_month_ago = timezone.now() - timedelta(days=30)

        # 获取并删除过期活动
        expired_activities = Activity.objects.filter(
            end_time__lt=one_month_ago,
            status__in=['completed', 'canceled']  # 只处理已结束或已取消的
        )

        count = expired_activities.count()
        expired_activities.delete()

        self.stdout.write(f'成功删除 {count} 条过期活动记录')

        # 每天凌晨3点执行
        # 0 3 * * * / path / to / your / venv / python / path / to / manage.py
        # cleanup_activities
        # 试运行（不实际删除）
        # python
        # manage.py
        # cleanup_activities - -dry - run
        #
        # # 实际执行
        # python
        # manage.py
        # cleanup_activities