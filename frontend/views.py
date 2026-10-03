from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

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
        {'error': 'Invalid credentials'})
            
    return render(request, 'frontend/login.html')
