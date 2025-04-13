"""
URL configuration for myproject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
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
# 在myproject/urls.py中添加
from django.urls import path, include
from django.contrib import admin
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from utils.views import check_database,get_users
from django.contrib.auth import views as auth_views
from rest_framework import status



@csrf_exempt
def test_api(request):
    print("==== 收到请求 ====")  # 在终端查看是否打印
    print("请求方法:", request.method)
    print("请求数据:", request.body)  # 小程序发送的原始数据
    return JsonResponse({"message": "Hello 小程序!", "data": request.POST})

urlpatterns = [
    path('api/', include('checkins.urls')),# 只有这个是查询打卡记录用到的
    path('api/test/', test_api),
    # path('api/test/', get_users),
    path('admin/', admin.site.urls),#用于测试数据库是否配置好
    path('api/getUserCheckinData/', get_users),
    #下面两个定义用户登录和登出功能的 URL 路由配置，它们使用了 Django 内置的认证视图（LoginView 和 LogoutView）
    path('login/', auth_views.LoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),


]