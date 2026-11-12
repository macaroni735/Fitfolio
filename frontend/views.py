from decimal import Decimal, InvalidOperation

from django.contrib.auth.decorators import login_required
from django.db.models import Q
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import UserCreationForm
from outfits.models import Outfit
from clothing.models import Clothing
from clothing.tags import normalize_tags

ARTICLE_TYPE_VALUES = {
    "tops",
    "bottoms",
    "dresses",
    "outerwear",
    "shoes",
    "accessories",
    "other",
}
CATEGORY_VALUES = {"womens", "mens", "unisex", "kids"}
TYPE_EXCLUSIVE_VALUES = {"all", "outfits", "clothing"}
CATEGORY_LABELS = {
    "womens": "Women's",
    "mens": "Men's",
    "unisex": "Unisex",
    "kids": "Kids",
}

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
    clothing_items = Clothing.objects.filter(
        user=request.user
    ).order_by('-created_at')

    
    def clothing_transform(item):
        transform = item.transform if isinstance(item.transform, dict) else {}
        return {
            'x': float(transform.get('x', 0.5)),
            'y': float(transform.get('y', 0.5)),
            'rotation': float(transform.get('rotation', 0)),
            'scale': float(transform.get('scale', 1)),
        }

    wardrobe_data = [
        {
            'id': str(item.id),
            'name': item.display_name,
            'article_type': item.article_type or '',
            'category': item.category or '',
            'transform': clothing_transform(item),
            'image': (
                item.final_front_image.url
                if item.final_front_image
                else item.processed_front_image.url
                if item.processed_front_image
                else item.original_front_image.url
                if item.original_front_image
                else ''
            )
        }
        for item in clothing_items
    ]


    return render(request, 'frontend/home.html', {
        'clothing_items': clothing_items,
        'wardrobe_data': wardrobe_data
    })

@login_required(login_url='login')
def wardrobe_view(request):
    clothing_items = Clothing.objects.filter(
        user=request.user
    ).prefetch_related('gallery_images').order_by('-created_at')

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
).prefetch_related(
    'clothing_placements__clothing'
).order_by('-created_at')

    clothing_items = Clothing.objects.filter(
        user=request.user
    ).prefetch_related('gallery_images').order_by('-created_at')

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

@login_required(login_url='login')
def community_view(request):
    type_values = _unique_getlist(request, "type")
    selected_types, include_clothing, include_outfits, article_types = (
        _resolve_type_filter(type_values)
    )
    selected_categories = [
        value for value in _unique_getlist(request, "category")
        if value in CATEGORY_VALUES
    ]
    search_mode = request.GET.get("search_mode", "tags").strip().lower()
    if search_mode == "name":
        search_mode = "keyword"
    if search_mode not in {"tags", "keyword"}:
        search_mode = "tags"
    selected_tags = normalize_tags(_unique_getlist(request, "tag"))
    tag_match = request.GET.get("tag_match", "any").strip().lower()
    if tag_match not in {"any", "all"}:
        tag_match = "any"
    keyword_query = " ".join(request.GET.get("q", "").split())
    include_description = request.GET.get("include_description", "").lower() == "true"
    for_sale_only = request.GET.get("for_sale", "").lower() == "true"
    budget = _parse_budget(request.GET.get("budget"))

    clothing_qs = Clothing.objects.none()
    outfit_qs = Outfit.objects.none()

    if include_clothing:
        clothing_qs = Clothing.objects.filter(publish=True).select_related("user")
        if article_types:
            clothing_qs = clothing_qs.filter(article_type__in=article_types)
        if selected_categories:
            clothing_qs = clothing_qs.filter(category__in=selected_categories)
        clothing_qs = _apply_search_filters(
            clothing_qs,
            search_mode=search_mode,
            tags=selected_tags,
            tag_match=tag_match,
            keyword_query=keyword_query,
            include_description=include_description,
        )
        clothing_qs = _apply_sale_filters(
            clothing_qs,
            for_sale_only=for_sale_only,
            budget=budget,
        )

    if include_outfits:
        outfit_qs = Outfit.objects.filter(publish=True).select_related(
            "user",
        ).prefetch_related("clothing")
        if selected_categories:
            outfit_qs = outfit_qs.filter(category__in=selected_categories)
        outfit_qs = _apply_search_filters(
            outfit_qs,
            search_mode=search_mode,
            tags=selected_tags,
            tag_match=tag_match,
            keyword_query=keyword_query,
            include_description=include_description,
        )
        outfit_qs = _apply_sale_filters(
            outfit_qs,
            for_sale_only=for_sale_only,
            budget=budget,
        )

    feed = []
    for item in clothing_qs:
        feed.append({
            "kind": "clothing",
            "object": item,
            "created_at": item.created_at,
            "category_label": CATEGORY_LABELS.get(item.category, item.category),
        })
    for outfit in outfit_qs:
        feed.append({
            "kind": "outfit",
            "object": outfit,
            "created_at": outfit.created_at,
            "category_label": outfit.get_category_display(),
        })
    feed.sort(key=lambda entry: entry["created_at"], reverse=True)

    return render(request, "frontend/community.html", {
        "community_feed": feed,
        "selected_types": selected_types,
        "selected_categories": selected_categories,
        "search_mode": search_mode,
        "selected_tags": selected_tags,
        "tag_match": tag_match,
        "keyword_query": keyword_query,
        "include_description": include_description,
        "for_sale_only": for_sale_only,
        "budget": "" if budget is None else format(budget, "f"),
        "article_type_options": [
            ("tops", "Tops"),
            ("bottoms", "Bottoms"),
            ("dresses", "Dresses"),
            ("outerwear", "Outerwear"),
            ("shoes", "Shoes"),
            ("accessories", "Accessories"),
            ("other", "Other"),
        ],
        "category_options": [
            ("womens", "Women's"),
            ("mens", "Men's"),
            ("unisex", "Unisex"),
            ("kids", "Kids"),
        ],
    })


def _unique_getlist(request, key):
    values = []
    seen = set()
    for raw in request.GET.getlist(key):
        value = str(raw or "").strip()
        if not value or value in seen:
            continue
        values.append(value)
        seen.add(value)
    return values


def _resolve_type_filter(type_values):
    exclusive = [value for value in type_values if value in TYPE_EXCLUSIVE_VALUES]
    article_types = [
        value for value in type_values
        if value in ARTICLE_TYPE_VALUES
    ]

    if article_types:
        return article_types, True, False, article_types

    selected = exclusive[-1] if exclusive else "all"
    if selected == "outfits":
        return ["outfits"], False, True, []
    if selected == "clothing":
        return ["clothing"], True, False, []
    return ["all"], True, True, []


def _apply_search_filters(
    queryset,
    *,
    search_mode,
    tags,
    tag_match,
    keyword_query,
    include_description,
):
    if search_mode == "keyword":
        if not keyword_query:
            return queryset
        query = Q(display_name__icontains=keyword_query)
        if include_description:
            query |= Q(description__icontains=keyword_query)
        return queryset.filter(query)

    if not tags:
        return queryset

    # SQLite JSONField does not support `contains`; match serialized tag strings.
    if tag_match == "all":
        for tag in tags:
            queryset = queryset.filter(tags__icontains=f'"{tag}"')
        return queryset

    tag_query = Q()
    for tag in tags:
        tag_query |= Q(tags__icontains=f'"{tag}"')
    return queryset.filter(tag_query)


def _apply_sale_filters(queryset, *, for_sale_only, budget):
    if not for_sale_only:
        return queryset

    queryset = queryset.filter(for_sale=True)
    if budget is not None:
        queryset = queryset.filter(price__isnull=False, price__lte=budget)
    return queryset


def _parse_budget(raw):
    value = str(raw or "").strip()
    if not value:
        return None
    try:
        amount = Decimal(value)
    except InvalidOperation:
        return None
    if amount < 0:
        return None
    return amount.quantize(Decimal("0.01"))

@login_required(login_url='login')
def profile_view(request):
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()

        if not username:
            return render(request, 'frontend/profile.html', {
                'error': 'Username cannot be empty.'
            })

        if User.objects.exclude(pk=request.user.pk).filter(username=username).exists():
            return render(request, 'frontend/profile.html', {
                'error': 'That username is already taken.'
            })

        request.user.username = username
        request.user.email = email
        request.user.save()

        return render(request, 'frontend/profile.html', {
            'success': 'Profile updated successfully!'
        })

    return render(request, 'frontend/profile.html')