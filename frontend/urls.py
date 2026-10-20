from django.contrib.auth import views as auth_views
from django.urls import path
from . import views
from clothing.views import process_clothing_image

urlpatterns = [
    path('', views.landing_view, name='landing'),
    path('login/', views.login_view, name='login'),
    path('home/', views.home_view, name='home'),
    path('logout/', views.logout_view, name='logout'),
    path('wardrobe/', views.wardrobe_view, name='wardrobe'),
    path('clothing-capture/', views.clothing_capture_view, name='clothing_capture'),
    path('clothing/process-image/', process_clothing_image, name='process_clothing_image'),
    path('create-outfit/', views.create_outfit_view, name='create_outfit'),
    path('register/', views.register_view, name='register'),
    path('password-reset/', auth_views.PasswordResetView.as_view(
        template_name='frontend/password_reset.html',
        email_template_name='frontend/password_reset_email.html',
        success_url='/password-reset/done/'
    ), name='password_reset'),
    path(
        'password-reset/done/',
        auth_views.PasswordResetDoneView.as_view(
        template_name='frontend/password_reset_done.html'
        ), name='password_reset_done'),
    path(
    'reset/<uidb64>/<token>/',
    auth_views.PasswordResetConfirmView.as_view(
        template_name='frontend/password_reset_confirm.html',
        success_url='/reset/done/'
    ), name='password_reset_confirm'),
    path(
    'reset/done/',
    auth_views.PasswordResetCompleteView.as_view(
        template_name='frontend/password_reset_success.html'
    ),
    name='password_reset_complete'),
]
