"""
URL configuration for DjangoProject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.urls import path, include
from django.contrib import admin
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth import views as auth_views
from activity import views
from rest_framework import status

from checkins.views import CheckinSubmitView
from login.views import auth_login
from login.views import complete_registration
from login.views import update_profile



@csrf_exempt
def test_api(request):
    print("==== 收到请求 ====")  # 在终端查看是否打印
    print("请求方法:", request.method)
    print("请求数据:", request.body)  # 小程序发送的原始数据
    return JsonResponse({"message": "Hello 小程序!", "data": request.POST})


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('create/', views.create_activity, name='create_activity')  # ✔️ 关联到自定义视图函数
    path('api/activity/create/', views.create_activity, name='create_activity'),
    path('api/activity/list/', views.list_activities, name='list_activities'),  # 新增列表接口
    path('api/activity/wechat/list/', views.wechat_activity_list, name='wechat_activity_list'),
    path('api/test/', test_api),
    path('login/test', auth_login, name='login'),
    path('login/register', complete_registration, name='register'),
    path('user/update', update_profile, name='update_profile'),
    path('checkins/submit-check', CheckinSubmitView.as_view(), name='checkin'),
]
