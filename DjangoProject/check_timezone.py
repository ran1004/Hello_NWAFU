import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DjangoProject.settings')
django.setup()

from django.utils import timezone
from activities.models import Activity

def check_time_conversion():
    obj = Activity.objects.first()
    print("数据库原始值（UTC）:", obj.published_at)
    print("转换为东八区:", timezone.localtime(obj.published_at))

if __name__ == '__main__':
    check_time_conversion()