"""
URL configuration for HelloDjangonew project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
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
from django.contrib import admin
from django.urls import path
from activity import views


urlpatterns = [
    path('admin/', admin.site.urls),
    # path('create/', views.create_activity, name='create_activity')  # ✔️ 关联到自定义视图函数
    path('api/activity/create/', views.create_activity, name='create_activity'),
    path('api/activity/list/', views.list_activities, name='list_activities'),  # 新增列表接口
]
