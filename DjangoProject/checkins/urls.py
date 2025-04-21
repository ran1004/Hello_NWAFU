# checkins/urls.py

from django.urls import path
from .views import CheckinListView

urlpatterns = [
    path('checkins/', CheckinListView.as_view(), name='checkin-list'),
]