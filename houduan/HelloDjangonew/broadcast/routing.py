#l路由配置

# broadcast/routing.py（新建文件）
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/notify/$", consumers.ActivityConsumer.as_asgi()),
]