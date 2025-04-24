# utils.py
from rest_framework import authentication
from django.contrib.auth import get_user_model
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from jwt import ExpiredSignatureError, InvalidTokenError


# 获取用户模型
User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """JWT认证类"""
    # 根据openid生成token
    @staticmethod
    def generate_token(openid):
        return jwt.encode(
            {
                'sub': openid,
                'exp': datetime.utcnow() + timedelta(days=30)
            },
            settings.JWT_SECRET,
            algorithm='HS256'
        )
    # 验证用户是否在User中
    def authenticate(self, request):
        """
        认证流程：
        1. 从请求头获取Bearer Token
        2. 解码JWT获取openid
        3. 通过openid查询用户
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        # 验证请求头格式
        if not auth_header.startswith('Bearer '):
            return None

        jwt_token = auth_header.split(' ')[1]
        print("Token:",jwt_token)
        try:
            # 解码JWT
            payload = jwt.decode(
                jwt_token,
                settings.JWT_SECRET,  # 确保在settings.py中配置
                algorithms=['HS256']
            )

            # 验证必要字段
            openid = payload.get('sub')
            if not openid:
                raise InvalidTokenError('Missing sub field in token')

            # 检查token过期时间
            exp_timestamp = payload.get('exp')
            if datetime.utcnow() > datetime.utcfromtimestamp(exp_timestamp):
                raise ExpiredSignatureError()

            # 查询用户
            user = User.objects.get(wx_openid=openid)
            return (user, None)

        except ExpiredSignatureError:
            # Token过期
            return None
        except InvalidTokenError:
            # 无效Token
            return None
        except User.DoesNotExist:
            # 用户不存在
            return None
        except Exception as e:
            # 其他异常
            print(f"JWT认证异常: {str(e)}")
            return None