from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Activity
import json
from datetime import datetime

from django.views.decorators.http import require_GET
from django.utils import timezone

@csrf_exempt
def create_activity(request):
    if request.method == 'POST':
        try:
            # 解析JSON数据
            data = json.loads(request.body)

            # 创建并保存活动
            activity = Activity(
                publisher=data['publisher'],
                title=data['title'],
                content=data['content'],
                activity_time=datetime.strptime(data['activity_time'], "%Y-%m-%d %H:%M:%S")
            )
            activity.save()

            return JsonResponse({
                "code": 0,
                "msg": "活动创建成功",
                "data": {
                    "id": activity.id,
                    "title": activity.title
                }
            })
        except Exception as e:
            return JsonResponse({
                "code": 1,
                "msg": f"错误：{str(e)}"
            }, status=400)
    else:
        return JsonResponse({"code": 1, "msg": "仅支持POST请求"}, status=405)


@require_GET
def list_activities(request):
    """获取活动列表接口（修复版）"""
    try:
        # 查询数据库并按创建时间倒序排列
        activities = Activity.objects.all().order_by('-created_at')

        # 安全序列化数据
        data = []
        for act in activities:
            try:
                item = {
                    "id": act.id,
                    "title": act.title,
                    "content": act.content,
                    "publisher": act.publisher,
                    "activity_time": timezone.localtime(act.activity_time).strftime("%Y-%m-%d %H:%M"),
                    "created_at": timezone.localtime(act.created_at).strftime("%Y-%m-%d %H:%M")
                }
                data.append(item)
            except Exception as e:
                print(f"序列化活动ID {act.id} 失败: {str(e)}")
                continue

        return JsonResponse({"code": 0, "data": data})

    except Exception as e:
        # 打印完整错误日志
        import traceback
        traceback.print_exc()
        return JsonResponse({"code": 1, "msg": f"服务器内部错误: {str(e)}"}, status=500)