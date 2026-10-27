

from django.urls import path
from . import views

urlpatterns = [
    path('save/', views.save_outfit, name='save_outfit'),
    path('delete/<uuid:outfit_id>/', views.delete_outfit, name='delete_outfit'),
]
