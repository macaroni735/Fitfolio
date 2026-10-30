import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.urls import reverse
from django.views.decorators.http import require_POST

from .models import Clothing, default_clothing_transform
from .services import remove_background_from_upload

CATEGORY_VALUES = {"womens", "mens", "unisex", "kids"}
ARTICLE_TYPE_VALUES = {
    "tops",
    "bottoms",
    "dresses",
    "outerwear",
    "shoes",
    "accessories",
    "other",
}


@require_POST
def process_clothing_image(request):
    uploaded_image = request.FILES.get("image")

    if uploaded_image is None:
        return JsonResponse(
            {"error": "No image was provided."},
            status=400,
        )

    if not uploaded_image.content_type.startswith("image/"):
        return JsonResponse(
            {"error": "Please upload a valid image."},
            status=400,
        )

    try:
        processed_image = remove_background_from_upload(uploaded_image)
    except Exception:
        return JsonResponse(
            {"error": "Image processing failed. Please try again."},
            status=500,
        )

    response = HttpResponse(
        processed_image,
        content_type="image/png",
    )
    response["Cache-Control"] = "no-store"
    return response


@login_required(login_url="login")
@require_POST
def create_clothing(request):
    original_image = request.FILES.get("original_front_image")
    processed_image = request.FILES.get("processed_front_image")
    final_image = request.FILES.get("final_front_image")
    original_back_image = request.FILES.get("original_back_image")
    processed_back_image = request.FILES.get("processed_back_image")
    final_back_image = request.FILES.get("final_back_image")

    if original_image is None or final_image is None:
        return JsonResponse(
            {"error": "Please finish capturing and editing the image first."},
            status=400,
        )

    display_name = request.POST.get("name", "").strip()
    if not display_name:
        return JsonResponse(
            {"error": "Please enter a name."},
            status=400,
        )

    published = _is_checked(request.POST.get("publish"))
    anonymous = published and _is_checked(request.POST.get("anonymous"))
    for_sale = published and _is_checked(request.POST.get("for_sale"))
    count = _parse_int(request.POST.get("count"), default=1)
    stock = _parse_int(request.POST.get("stock"), default=1, maximum=count)

    clothing = Clothing(
        user=request.user,
        display_name=display_name[:100],
        description=request.POST.get("description", "").strip(),
        category=_choice(request.POST.get("category"), CATEGORY_VALUES, "unisex"),
        article_type=_choice(
            request.POST.get("article_type"),
            ARTICLE_TYPE_VALUES,
            "other",
        ),
        size=request.POST.get("size", "").strip()[:20],
        tags=_parse_tags(request.POST.get("tags")),
        count=count,
        price=_parse_price(request.POST.get("price"), for_sale),
        publish=published,
        anonymous=anonymous,
        for_sale=for_sale,
        stock=stock,
        transform=_parse_transform(request.POST.get("transform")),
    )

    _assign_image(clothing, "original_front_image", original_image, "original_front")
    _assign_image(
        clothing,
        "processed_front_image",
        processed_image or final_image,
        "processed_front",
    )
    _assign_image(clothing, "final_front_image", final_image, "final_front")

    if final_back_image is not None:
        if original_back_image is not None:
            _assign_image(
                clothing,
                "original_back_image",
                original_back_image,
                "original_back",
            )
        _assign_image(
            clothing,
            "processed_back_image",
            processed_back_image or final_back_image,
            "processed_back",
        )
        _assign_image(clothing, "final_back_image", final_back_image, "final_back")

    clothing.save()

    return JsonResponse({"redirect": reverse("wardrobe")})


def _choice(value, allowed, default):
    value = (value or "").strip()
    return value if value in allowed else default


def _is_checked(value):
    return str(value or "").lower() in {"1", "true", "on", "yes"}


def _parse_int(value, default=1, minimum=0, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(parsed, maximum)
    return parsed


def _parse_price(value, for_sale):
    if not for_sale:
        return None

    try:
        amount = Decimal(str(value if value not in (None, "") else "0"))
    except InvalidOperation:
        amount = Decimal("0")

    if amount < 0:
        amount = Decimal("0")

    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_tags(raw):
    if not raw:
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return [part.strip() for part in raw.split(",") if part.strip()]

    if not isinstance(data, list):
        return []

    tags = []
    seen = set()
    for item in data:
        if not isinstance(item, str):
            continue
        tag = " ".join(item.split())
        key = tag.lower()
        if tag and key not in seen:
            tags.append(tag)
            seen.add(key)
    return tags


def _parse_transform_values(data, fallback=None):
    transform = dict(fallback or default_clothing_transform())
    if not isinstance(data, dict):
        return transform

    for key in ("x", "y", "rotation", "scale"):
        try:
            transform[key] = float(data[key])
        except (KeyError, TypeError, ValueError):
            continue

    return transform


def _parse_transform(raw):
    transform = default_clothing_transform()
    if not raw:
        return transform

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return transform

    if not isinstance(data, dict):
        return transform

    transform = _parse_transform_values(data, transform)
    back_data = data.get("back")
    if isinstance(back_data, dict):
        transform["back"] = _parse_transform_values(back_data)

    return transform


def _assign_image(clothing, field_name, uploaded_file, prefix):
    extension = Path(getattr(uploaded_file, "name", "")).suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp"}:
        extension = ".png"

    getattr(clothing, field_name).save(
        f"{clothing.id}_{prefix}{extension}",
        uploaded_file,
        save=False,
    )
