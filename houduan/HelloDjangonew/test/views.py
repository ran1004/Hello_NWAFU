# views.py
from django.db import connection
from django.http import JsonResponse

def test_db_connection(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            one = cursor.fetchone()[0]
        return JsonResponse({'status': 'success', 'message': f'Database connection test successful. Result: {one}'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)