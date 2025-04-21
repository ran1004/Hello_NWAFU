# checkins/tests.py



# 不用，没有跑通，用于测试向数据库插入数据是否成功

from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from .models import Checkin
from datetime import datetime, timedelta

class CheckinAPITests(APITestCase):
    def setUp(self):
        # 创建测试用户
        # 使用 get_or_create 创建用户
        self.user, self.created = User.objects.get_or_create(username='testuser', defaults={'password': 'testpass123'})
        if created:
            print("用户创建成功")
        else:
            print("用户已存在")

        self.client.force_authenticate(user=self.user)

        # 获取当前时间
        self.now = datetime.now()

        # 创建测试打卡数据
        Checkin.objects.create(user=self.user, checkin_time=self.now - timedelta(days=3))
        Checkin.objects.create(user=self.user, checkin_time=self.now - timedelta(days=5))
        Checkin.objects.create(user=self.user, checkin_time=self.now - timedelta(days=10))  # 超过一周

        Checkin.objects.create(user=self.user, checkin_time=self.now - timedelta(days=20))
        Checkin.objects.create(user=self.user, checkin_time=self.now - timedelta(days=25))  # 超过一月

    def test_get_checkins_week_valid(self):
        """测试获取最近一周的打卡数据（有效请求）"""
        url = reverse('checkin-list')
        response = self.client.get(url, {'userId': self.user.id, 'timeRange': 'week'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertTrue(len(data) >= 2)  # 根据创建的数据，应该有2条在一周内

    def test_get_checkins_month_valid(self):
        """测试获取最近一月的打卡数据（有效请求）"""
        url = reverse('checkin-list')
        response = self.client.get(url, {'userId': self.user.id, 'timeRange': 'month'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(len(data), 4)  # 根据创建的数据，应该有4条在一个月内

    def test_get_checkins_missing_userId(self):
        """测试缺少 userId 参数"""
        url = reverse('checkin-list')
        response = self.client.get(url, {'timeRange': 'week'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_checkins_invalid_timeRange(self):
        """测试无效的 timeRange 参数"""
        url = reverse('checkin-list')
        response = self.client.get(url, {'userId': self.user.id, 'timeRange': 'invalid'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_checkins_user_not_found(self):
        """测试用户不存在的情况"""
        url = reverse('checkin-list')
        response = self.client.get(url, {'userId': 999, 'timeRange': 'week'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)