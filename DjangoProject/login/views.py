import os
import time
import jwt
import requests
import json
import re
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse
from pymysql import IntegrityError

from .models import User
from django.views.decorators.csrf import csrf_exempt
from myutils import JWTAuthentication
from django.core.files.base import ContentFile
import traceback

# 将配置移到settings.py中
WEAPP_ID = getattr(settings, 'WEAPP_ID')
WEAPP_SECRET = getattr(settings, 'WEAPP_SECRET')
JWT_SECRET = '201126djc'


def auth_login(request):
    print("开始登陆----")
    if request.method == 'POST':
        data = json.loads(request.body)
        code = data.get('code')

        resp = requests.get(
            'https://api.weixin.qq.com/sns/jscode2session',
            params={
                'appid': settings.WEAPP_ID,
                'secret': settings.WEAPP_SECRET,
                'js_code': code,
                'grant_type': 'authorization_code'
            }
        )

        wechat_data = resp.json()
        if 'errcode' in wechat_data:
            return JsonResponse({'error': wechat_data['errmsg']}, status=400)

        openid = wechat_data['openid']
        session_key = wechat_data['session_key']

        try:
            user = User.objects.get(wx_openid=openid)
            return JsonResponse({
                'status': 'authorized',
                'token': JWTAuthentication.generate_token(openid)  # 【修改】使用统一方法
            })
        except User.DoesNotExist:
            return JsonResponse({
                'status': 'require_registration',
                'temp_token': JWTAuthentication.generate_temp_token(openid)  # 【修改】使用统一方法
            })


def complete_registration(request):
    # 用户注册访问的接口
    print("用户开始注册----")
    if request.method == 'POST':
        data = json.loads(request.body)
        print("注册", data)
        # 临时令牌
        temp_token = data.get('temp_token')
        print("---临时token", temp_token)
        # 获取全部用户信息
        user_info = data.get('user_info')
        try:
            # 【修改】使用统一方法解码token
            payload = JWTAuthentication.decode_token(temp_token)
            openid = payload.get('sub').replace('temp_', '')
            # 【新增】检查用户是否已存在
            if User.objects.filter(wx_openid=openid).exists():
                return JsonResponse({'error': '用户已注册'}, status=409)
            # 向数据库中添加记录
            User.objects.create(
                wx_openid=openid,
                name=user_info['name'],
                avatar=user_info['avatarUrl'],
                student_id=user_info['student_id'],
                class_name=user_info['class_name'],
                # session_key=user_info['session_key']
            )
            # 生成正式token
            token = JWTAuthentication.generate_token(openid)
            print("正式token-----", token)
            print("用户注册成功")
            return JsonResponse({
                'status': 'registered',
                'token': token
            })
        except IntegrityError:  # 处理唯一约束冲突
            return JsonResponse({'error': '用户已存在'}, status=409)
        except jwt.ExpiredSignatureError:  # 超时提醒
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError:  # 无效token
            return JsonResponse({'error': 'Invalid token'}, status=400)


def update_profile(request):
    """
    用户资料更新接口：当用户点击编辑个人资料后进入该接口
    http://127.0.0.1:8000/user/update
    put
    Authorization
    """
    print("开始更新资料----")
    if request.method in ['PUT', 'PATCH']:
        # 认证过程
        try:
            # 【修改】使用统一方法获取openid
            openid = JWTAuthentication.get_openid_from_request(request)
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': '登录凭证已过期'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'error': '无效登录凭证'}, status=401)

        # 3. 获取用户对象
        try:
            user = User.objects.get(wx_openid=openid)
        except User.DoesNotExist:
            return JsonResponse({'error': '用户不存在'}, status=404)

        # 4. 解析请求数据
        try:
            update_data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': '请求数据格式错误'}, status=400)

        # 5. 定义可更新字段及验证规则
        allowed_fields = {
            'name': {
                'required': True,
                'max_length': 20,
                'regex': r'^[\u4e00-\u9fa5a-zA-Z]{2,20}$'  # 中英文姓名
            },
            'student_id': {
                'required': True,
                'max_length': 20
            },
            'class_name': {
                'required': False,
                'max_length': 50
            },
            'avatar': {
                'required': False,
                'max_length': 200  # 头像URL长度限制
            },
            'email': {
                'required': False,
                'max_length': 200  # 头像URL长度限制
            }
        }

        # 6. 数据清洗与验证
        valid_updates = {}
        for field, config in allowed_fields.items():
            value = update_data.get(field)

            # 处理必填字段
            if config['required'] and not value:
                return JsonResponse({'error': f'{field}为必填字段'}, status=400)

            # 字段存在时才验证
            if value is not None:
                # 长度校验
                if len(str(value)) > config['max_length']:
                    return JsonResponse({'error': f'{field}超过最大长度限制'}, status=400)

                # 正则校验
                if 'regex' in config:
                    if not re.match(config['regex'], str(value)):
                        return JsonResponse({'error': f'{field}格式不合法'}, status=400)

                valid_updates[field] = value

        # 7. 执行更新操作
        try:
            # 使用update_fields优化更新性能
            update_fields = []
            for field, value in valid_updates.items():
                setattr(user, field, value)
                update_fields.append(field)

            if update_fields:
                user.save(update_fields=update_fields)
        except IntegrityError as e:
            # 处理唯一性约束等数据库错误
            return JsonResponse({'error': '数据冲突，请检查输入'}, status=409)
        except Exception as e:
            # 记录系统级错误日志
            print(f"用户资料更新失败: {str(e)}")
            return JsonResponse({'error': '系统错误，请稍后重试'}, status=500)
        print("更新资料完成----")
        # 8. 返回更新后的用户信息
        return JsonResponse({
            'status': 'success',
            'updated_info': {
                'name': user.name,
                'class_name': user.class_name,
                'updated_at': user.date_joined.strftime('%Y-%m-%d %H:%M:%S')
            }
        })
    else:
        return JsonResponse({'error': '不支持的请求方法'}, status=405)


# ===================== 【新增1：匿名用户上传处理】 =====================
def handle_anonymous_upload(request, raw_openid):
    """处理未注册用户的上传请求"""
    print("临时用户上传头像-----")
    if 'avatar' not in request.FILES:
        return JsonResponse({'error': '未上传文件'}, status=400)

    try:
        # 存储到临时目录
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
        os.makedirs(temp_dir, exist_ok=True)

        # 生成带openid哈希的文件名
        import hashlib
        file_hash = hashlib.md5(raw_openid.encode()).hexdigest()[:8]
        filename = f"temp_{file_hash}_{int(time.time())}.jpg"

        # 保存文件
        with open(os.path.join(temp_dir, filename), 'wb+') as f:
            for chunk in request.FILES['avatar'].chunks():
                f.write(chunk)
        print("临时上传头像成功----")
        return JsonResponse({
            'url': f"/media/temp_uploads/{filename}",
            'status': 'temp_upload'
        })
    except Exception as e:
        return JsonResponse({'error': '文件保存失败'}, status=500)


def upload_avatar(request):
    print("头像开始上传----")
    try:
        # 1. JWT认证
        auth = JWTAuthentication()
        user_auth = auth.authenticate(request)
        # 2. 检查认证结果
        if user_auth is None:
            return JsonResponse({
                'error': '认证失败：无效或过期的Token',
                'code': 'AUTH_FAILED'
            }, status=401)
        user, _ = user_auth  # 安全解包
        # 3. 处理匿名用户（临时token）
        if isinstance(user, AnonymousUser):
            try:
                # 获取原始openid
                print("匿名用户")
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
                raw_openid = payload['sub'].replace('temp_', '')
                return handle_anonymous_upload(request, raw_openid)
            except Exception as e:
                print(f"临时用户处理错误: {str(e)}")
                return JsonResponse({
                    'error': '临时用户处理失败',
                    'code': 'TEMP_USER_ERROR'
                }, status=400)
        # ...原有正式用户处理逻辑...
        # 2. 文件验证
        if 'avatar' not in request.FILES:
            print("未检测到文件字段")
            return JsonResponse({'error': '请选择头像文件'}, status=400)

        uploaded_file = request.FILES['avatar']
        print(f"文件名: {uploaded_file.name}, 大小: {uploaded_file.size}字节")

        # 3. 文件存储
        try:
            # 创建存储目录（确保存在）
            avatar_dir = os.path.join(settings.MEDIA_ROOT, settings.AVATAR_UPLOAD_DIR)
            os.makedirs(avatar_dir, exist_ok=True)
            # 生成唯一文件名
            file_ext = os.path.splitext(uploaded_file.name)[1]
            new_filename = f"avatar_{user.student_id}_{int(time.time())}{file_ext}"
            # 使用ContentFile避免临时文件
            with ContentFile(uploaded_file.read()) as file_content:
                fs = FileSystemStorage(location=avatar_dir)
                filename = fs.save(new_filename, file_content)
                print(f"文件保存成功: {filename}")

            # 更新用户模型
            user.avatar = os.path.join(settings.AVATAR_UPLOAD_DIR, filename)
            user.save(update_fields=['avatar'])
            print("头像上传成功----")

            # 返回完整URL（确保MEDIA_URL配置正确）
            full_url = request.build_absolute_uri(
                f"{settings.MEDIA_URL}{user.avatar.url.lstrip('/')}"
            )

            return JsonResponse({
                'url': full_url,
                'filename': filename,
                'status': 'success'
            })

        except Exception as e:
            print(f"文件处理异常:\n{traceback.format_exc()}")
            return JsonResponse({'error': '文件处理失败'}, status=500)

    except Exception as e:
        print(f"全局异常:\n{traceback.format_exc()}")
        return JsonResponse({'error': '服务器内部错误'}, status=500)
