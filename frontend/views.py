from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from outfits.models import Outfit
from clothing.models import Clothing

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
    clothing_items = Clothing.objects.filter(
        user=request.user
    ).order_by('-created_at')

    return render(request, 'frontend/wardrobe.html', {
        'clothing_items': clothing_items,
    })

@login_required(login_url='login')
def clothing_capture_view(request):
    return render(request, 'frontend/clothing_capture.html')

@login_required(login_url='login')
def create_outfit_view(request):
    saved_outfits = Outfit.objects.filter(
        user=request.user
    ).order_by('-created_at')

    clothing_items = Clothing.objects.filter(
        user=request.user
    ).order_by('-created_at')

    return render(request, 'frontend/create_outfit.html', {
        'saved_outfits': saved_outfits,
        'clothing_items': clothing_items
    })

def logout_view(request):
    logout(request)
    return redirect('login')

def register_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)

        if form.is_valid():
            user = form.save()
            user.email = request.POST.get('email', '').strip()
            user.save()
            return redirect('login')
    else:
        form = UserCreationForm()

    return render(request, 'frontend/register.html', {'form': form})

def landing_view(request):
    return render(request, 'frontend/landing.html')