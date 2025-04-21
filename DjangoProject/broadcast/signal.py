# broadcast/signals.py（新建文件）
# broadcast/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from activity.models import Activity

# 信号处理（发布活动时触发）
@receiver(post_save, sender=Activity)
def notify_new_activity(sender, instance,  ** kwargs):
    # 仅在新建活动时推送（避免更新干扰）
    if not kwargs.get('created'):
        return

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "activity_notify",
        {
            "type": "activity.created",
            "data": {
                "id": instance.id,
                "title": instance.title,
                "publisher": instance.publisher,
                "time": instance.activity_time.strftime("%Y-%m-%d %H:%M")
            }
        }
    )