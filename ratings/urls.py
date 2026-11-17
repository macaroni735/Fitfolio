from django.urls import path
from . import views

urlpatterns = [
    path('outfit/<uuid:outfit_id>/', views.rate_outfit, name='rate_outfit'),
    path('clothing/<uuid:clothing_id>/', views.rate_clothing, name='rate_clothing'),
]
