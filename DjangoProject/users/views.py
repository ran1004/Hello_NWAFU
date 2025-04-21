# views.py
from django.contrib.auth import get_user_model
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

Student = get_user_model()  # 动态获取自定义用户模型

@csrf_exempt
def get_users(request):
    if request.method == 'GET':
        students = Student.objects.filter(is_active=True)
        data = [{
            'student_id': s.student_id,
            'name': s.name,
            'class': s.class_name,
        } for s in students]
        return JsonResponse({'students': data})