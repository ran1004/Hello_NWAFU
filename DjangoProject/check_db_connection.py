#!/usr/bin/env python
import os
import django

# 设置 Django 环境（必须）
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'DjangoProject.settings')
django.setup()

from django.db import connection


def check_database():
    print("=== 数据库配置信息 ===")
    print(connection.settings_dict)

    print("\n=== 测试连接 ===")
    try:
        connection.ensure_connection()
        print("✅ 数据库连接成功！")
    except Exception as e:
        print(f"❌ 连接失败: {e}")


if __name__ == '__main__':
    check_database()