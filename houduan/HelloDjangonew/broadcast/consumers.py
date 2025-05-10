# broadcast/consumers.py（新建文件）
# 配置广播模块
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ActivityConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 所有用户加入广播组
        await self.channel_layer.group_add("activity_notify", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("activity_notify", self.channel_name)

    async def activity_created(self, event):
        # 推送新活动到客户端
        await self.send(text_data=json.dumps(event["data"]))