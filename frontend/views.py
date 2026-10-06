from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout


def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')


        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = None

        if user is not None:
            authenticated_user = authenticate(
                request,
                username=user.username,
                password=password
            )

            if authenticated_user is not None:
                login(request, authenticated_user)
                return redirect('home')
            
        return render(request,
        'frontend/login.html',
        {'error': 'Wrong email or password. Please try again.'})
            
    return render(request, 'frontend/login.html')

@login_required(login_url='login')
def home_view(request):
    return render(request, 'frontend/home.html')

@login_required(login_url='login')
def wardrobe_view(request):
    return render(request, 'frontend/wardrobe.html')

@login_required(login_url='login')
def create_outfit_view(request):
    return render(request, 'frontend/create_outfit.html')

def logout_view(request):
    logout(request)
    return redirect('login')