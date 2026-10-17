from django.urls import path
from . import views
from clothing.views import process_clothing_image

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('home/', views.home_view, name='home'),
    path('logout/', views.logout_view, name='logout'),
    path('wardrobe/', views.wardrobe_view, name='wardrobe'),
    path('clothing-capture/', views.clothing_capture_view, name='clothing_capture'),
    path('clothing/process-image/', process_clothing_image, name='process_clothing_image'),
    path('create-outfit/', views.create_outfit_view, name='create_outfit'),
]
