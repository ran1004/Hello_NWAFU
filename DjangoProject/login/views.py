import jwt
import requests
import json
import re
from datetime import datetime, timedelta
from django.conf import settings
from django.http import JsonResponse
from pymysql import IntegrityError

from .models import WechatUser,User
from django.views.decorators.csrf import csrf_exempt
WEAPP_ID = 'wxb199f5280a879e1d'
WEAPP_SECRET = '67cc3f12fa469186c190649b32af759f'
#测试号
# WEAPP_ID = 'wxcdfe41374fd22611'
# WEAPP_SECRET = '03bed39554eea4f43cd5639b093e9c83'
JWT_SECRET = '201126djc'


def generate_token(openid):
    return jwt.encode(
        {
            'sub': openid,
            'exp': datetime.utcnow() + timedelta(days=30)
        },
        JWT_SECRET,
        algorithm='HS256'
    )

@csrf_exempt
def auth_login(request):
    #用户进入小程序访问的第一个API
    #区分用户到底是登陆还是注册
    print("开始登陆")
    if request.method == 'POST':
        data=json.loads(request.body)
        #code:临时令牌，有效期5min,用于向微信服务器换取openid和session_key
        code = data.get('code')
        print("---",code)
        # 请求微信认证接口
        resp = requests.get(
            'https://api.weixin.qq.com/sns/jscode2session',
            params={
                'appid': WEAPP_ID,
                'secret': WEAPP_SECRET,
                'js_code': code,
                'grant_type': 'authorization_code'
            }
        )
        print(resp.json())
        wechat_data = resp.json()
        if 'errcode' in wechat_data:
            return JsonResponse({'error': wechat_data['errmsg']}, status=400)

        # 用户数据校验
        # 用户唯一标识
        openid = wechat_data['openid']
        # 会话密钥
        session_key = wechat_data['session_key']

        try:
            user = WechatUser.objects.get(openid=openid)
            user.session_key = session_key
            user.save()
            return JsonResponse({
                'status': 'authorized',
                'token': generate_token(openid)
            })

        except WechatUser.DoesNotExist:
            return JsonResponse({
                'status': 'require_registration',
                'temp_token': generate_token(openid)
            })


@csrf_exempt
def complete_registration(request):
    #用户注册访问的接口
    if request.method == 'POST':
        data = json.loads(request.body)
        print("注册",data)
        # 临时令牌
        temp_token = data.get('temp_token')
        # 获取全部用户信息
        user_info = data.get('user_info')

        try:
            decoded = jwt.decode(temp_token, JWT_SECRET, algorithms=['HS256'])
            openid = decoded['sub']
            #向数据库中添加记录
            User.objects.create(
                wx_openid=openid,
                name=user_info['name'],
                avatar=user_info['avatarUrl'],
                student_id=user_info['student_id'],
                class_name=user_info['class_name'],
                # session_key=user_info['session_key']
            )
            print("用户注册成功")
            return JsonResponse({
                'status': 'registered',
                'token': generate_token(openid)
            })
        except IntegrityError:  # 处理唯一约束冲突
            return JsonResponse({'error': '用户已存在'}, status=409)
        except jwt.ExpiredSignatureError: #超时提醒
            return JsonResponse({'error': 'Token expired'}, status=401)
        except jwt.InvalidTokenError: #无效token
            return JsonResponse({'error': 'Invalid token'}, status=400)


@csrf_exempt
def update_profile(request):
    """
    用户资料更新接口：当用户点击编辑个人资料后进入该接口
    http://127.0.0.1:8000/user/update
    put
    Authorization
    """
    print(request.body)
    if request.method in ['PUT', 'PATCH']:
        # 1. 验证认证信息
        auth_header = request.headers.get('Authorization')
        if not auth_header or 'Bearer ' not in auth_header:
            return JsonResponse({'error': '未提供有效认证信息'}, status=401)
        # 2. 解析JWT Token
        try:
            token = auth_header.split('Bearer ')[1]
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            openid = decoded['sub']#获取用户唯一标识
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