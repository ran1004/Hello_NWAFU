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
from rest_framework import status

from checkins.views import CheckinSubmitView, PhotoUploadView
from login.views import auth_login, upload_avatar
from login.views import complete_registration
from login.views import update_profile

from activities.views import (
    ActivityListView,
    ActivityDetailView,
    ActivityCreateView, ImageUploadView
)



urlpatterns = [
    path('admin/', admin.site.urls),
    # path('create/', views.create_activity, name='create_activity')  # ✔️ 关联到自定义视图函数
    path('activities/', ActivityListView.as_view(), name='activity-list'),
    path('activities/<int:id>/', ActivityDetailView.as_view(), name='activity-detail'),
    path('activities/create/', ActivityCreateView.as_view(), name='activity-create'),
    path('activities/upload/', ImageUploadView.as_view(), name='image-upload'),

    path('login/test', auth_login, name='login'),
    path('login/register', complete_registration, name='register'),
    path('user/update', update_profile, name='update_profile'),
    path('checkins/submit-check', CheckinSubmitView.as_view(), name='checkin'),
    path('upload-photo/', PhotoUploadView.as_view(), name='upload-photo'),
    path('upload/avatar', upload_avatar)
]
