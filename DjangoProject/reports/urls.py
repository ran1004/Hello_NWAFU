# reports/urls.py
from django.urls import path
from .views import ExportCheckinData, ExportTemplateListCreateView, ExportTemplateDetailView

urlpatterns = [
    path('export/<int:activity_id>/', ExportCheckinData.as_view(), name='export-checkins2'),
    path('templates/', ExportTemplateListCreateView.as_view(), name='template-list'),
    path('templates/<int:pk>/', ExportTemplateDetailView.as_view(), name='template-detail'),
]