from rest_framework import authentication
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from jwt import ExpiredSignatureError, InvalidTokenError

User = get_user_model()


class JWTAuthentication(authentication.BaseAuthentication):
    """增强版JWT认证类"""

    @classmethod
    def decode_token(cls, token):
        """统一解码方法"""
        try:
            return jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256']
            )
        except ExpiredSignatureError:
            raise ValueError('Token expired')
        except InvalidTokenError:
            raise ValueError('Invalid token')

    @classmethod
    def get_openid_from_request(cls, request):
        """从请求头提取并验证token"""
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            raise ValueError('Missing or invalid Authorization header')

        token = auth_header.split(' ')[1]
        payload = cls.decode_token(token)
        return payload.get('sub')

    @staticmethod
    def generate_temp_token(openid):
        """生成临时token"""
        return jwt.encode(
            {
                'sub': f'temp_{openid}',
                'exp': datetime.utcnow() + timedelta(hours=1)
            },
            settings.JWT_SECRET,
            algorithm='HS256'
        )

    @staticmethod
    def generate_token(openid):
        """生成正式token"""
        return jwt.encode(
            {
                'sub': openid,
                'exp': datetime.utcnow() + timedelta(days=30)
            },
            settings.JWT_SECRET,
            algorithm='HS256'
        )

    def authenticate(self, request):
        """认证主逻辑"""
        try:
            openid = self.get_openid_from_request(request)

            if openid.startswith('temp_'):
                return (AnonymousUser(), None)

            try:
                user = User.objects.get(wx_openid=openid)
                return (user, None)
            except User.DoesNotExist:
                return None

        except ValueError as e:
            print(f"[AUTH ERROR] {str(e)}")
            return None
