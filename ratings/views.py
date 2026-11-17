from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST
from outfits.models import Outfit
from .models import Rating
from clothing.models import Clothing

@login_required(login_url='login')
@require_POST
def rate_outfit(request, outfit_id):
    outfit = get_object_or_404(
        Outfit,
        id=outfit_id,
        publish=True
    )

    if outfit.user_id == request.user.id:
        return JsonResponse({
            'success': False,
            'error': 'You cannot rate your own outfit.'
        }, status=403)

    try:
        stars = int(request.POST.get('rating', ''))
    except (ValueError, TypeError):
        return JsonResponse({
            'success': False,
            'error': 'Please select a rating from 1 to 5.'
        }, status=400)

    if stars < 1 or stars > 5:
        return JsonResponse({
            'success': False,
            'error': 'Rating must be between 1 and 5.'
        }, status=400)

    title = request.POST.get('title', '').strip()
    description = request.POST.get('description', '').strip()

    if len(title) > 100:
        return JsonResponse({
            'success': False,
            'error': 'Review title must be 100 characters or fewer.'
        }, status=400)

    rating, created = Rating.objects.update_or_create(
        user=request.user,
        outfit=outfit,
        defaults={
            'rating': stars,
            'title': title,
            'description': description
        }
    )

    return JsonResponse({
        'success': True,
        'rating': rating.rating,
        'title': rating.title,
        'description': rating.description,
        'created': created
    })


@login_required(login_url='login')
@require_POST
def rate_clothing(request, clothing_id):
    clothing = get_object_or_404(
        Clothing,
        id=clothing_id,
        publish=True
    )

    if clothing.user_id == request.user.id:
        return JsonResponse({
            'success': False,
            'error': 'You cannot rate your own clothing.'
        }, status=403)

    try:
        stars = int(request.POST.get('rating', ''))
    except (ValueError, TypeError):
        return JsonResponse({
            'success': False,
            'error': 'Please select a rating from 1 to 5.'
        }, status=400)

    if stars < 1 or stars > 5:
        return JsonResponse({
            'success': False,
            'error': 'Rating must be between 1 and 5.'
        }, status=400)

    title = request.POST.get('title', '').strip()
    description = request.POST.get('description', '').strip()

    if len(title) > 100:
        return JsonResponse({
            'success': False,
            'error': 'Review title must be 100 characters or fewer.'
        }, status=400)

    rating, created = Rating.objects.update_or_create(
        user=request.user,
        clothing=clothing,
        defaults={
            'rating': stars,
            'title': title,
            'description': description
        }
    )

    return JsonResponse({
        'success': True,
        'rating': rating.rating,
        'title': rating.title,
        'description': rating.description,
        'created': created
    })
