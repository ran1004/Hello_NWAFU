from django.http import JsonResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.db import connection
import json


@csrf_exempt
def check_database(request):
    """检查Django核心表状态"""
    if request.method != 'GET':
        return JsonResponse({'error': '仅支持GET请求'}, status=405)

    try:
        # 检查核心表是否存在
        with connection.cursor() as cursor:
            cursor.execute("SHOW TABLES LIKE 'auth_user'")
            user_table_exists = cursor.fetchone() is not None

            cursor.execute("SHOW TABLES LIKE 'django_session'")
            session_table_exists = cursor.fetchone() is not None

        # 获取用户数量
        user_count = User.objects.count()

        return JsonResponse({
            'status': 'success',
            'tables': {
                'auth_user': user_table_exists,
                'django_session': session_table_exists
            },
            'user_count': user_count
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def get_users(request):
    """获取用户信息API"""
    if request.method == 'GET':
        # 获取查询参数
        limit = int(request.GET.get('limit', 10))
        offset = int(request.GET.get('offset', 0))

        users = User.objects.all()[offset:offset + limit]

        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S'),
                'last_login': user.last_login.strftime('%Y-%m-%d %H:%M:%S') if user.last_login else None
            })

        return JsonResponse({
            'status': 'success',
            'count': len(user_list),
            'users': user_list
        })

    elif request.method == 'POST':
        # 创建新用户（示例）
        try:
            data = json.loads(request.body)
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password']
            )
            return JsonResponse({'status': 'success', 'user_id': user.id}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    else:
        return JsonResponse({'error': '方法不允许'}, status=405)