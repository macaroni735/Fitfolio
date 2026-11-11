
import json
import math
from pathlib import Path
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import transaction

from clothing.images import InvalidClothingImage, prepare_uploaded_image
from clothing.models import Clothing
from clothing.tags import normalize_tags
from .models import Outfit, OutfitClothing


@login_required
@require_POST
def save_outfit(request):
    data, thumbnail_upload = _parse_save_request(request)
    if data is None:
        return JsonResponse({"error": "Invalid request."}, status=400)

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    clothing_ids = data.get("clothing_ids", [])
    clothing_transforms = data.get("clothing_transforms", {})
    publish = data.get("publish", False)
    outfit_id = data.get("outfit_id")
    tags = normalize_tags(data.get("tags", []))

    if not name or len(name) > 100:
        return JsonResponse({"error": "Enter a valid outfit name."}, status=400)

    if not isinstance(clothing_ids, list) or not clothing_ids:
        return JsonResponse({"error": "Select at least one clothing item."}, status=400)

    if not isinstance(publish, bool):
        return JsonResponse({"error": "Invalid sharing option."}, status=400)

    anonymous = publish and bool(data.get("anonymous", False))
    for_sale = publish and bool(data.get("for_sale", False))
    if anonymous and for_sale:
        return JsonResponse(
            {"error": "Anonymous and For Sale can't both be selected."},
            status=400,
        )

    price = _parse_price(data.get("price"), for_sale)

    if len(clothing_ids) != len(set(map(str, clothing_ids))):
        return JsonResponse({"error": "Duplicate clothing items."}, status=400)

    if not isinstance(clothing_transforms, dict):
        return JsonResponse({"error": "Invalid clothing transforms."}, status=400)

    selected_ids = {str(item_id) for item_id in clothing_ids}

    for item_id, transform in clothing_transforms.items():
        if str(item_id) not in selected_ids:
            return JsonResponse({"error": "Invalid clothing item transform."}, status=400)

        if not isinstance(transform, dict):
            return JsonResponse({"error": "Invalid clothing transform."}, status=400)

        if set(transform.keys()) != {"x", "y", "rotation", "scale"}:
            return JsonResponse({"error": "Incomplete clothing transform."}, status=400)

        for key in ("x", "y", "rotation", "scale"):
            value = transform[key]

            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return JsonResponse({"error": "Invalid transform value."}, status=400)

            if not math.isfinite(value):
                return JsonResponse({"error": "Invalid transform value."}, status=400)

        if not (-0.25 <= transform["x"] <= 1.25 and -0.25 <= transform["y"] <= 1.25):
            return JsonResponse({"error": "Clothing position is out of bounds."}, status=400)

        if not (-360 <= transform["rotation"] <= 360):
            return JsonResponse({"error": "Invalid clothing rotation."}, status=400)

        if not (0.1 <= transform["scale"] <= 5):
            return JsonResponse({"error": "Invalid clothing scale."}, status=400)

    try:
        clothing = list(
            Clothing.objects.filter(user=request.user, pk__in=clothing_ids)
        )
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid clothing selection."}, status=400)

    if len(clothing) != len(clothing_ids):
        return JsonResponse({"error": "Invalid clothing selection."}, status=400)

    if publish and any(not item.publish for item in clothing):
        return JsonResponse({
            "error": "To share this outfit, all selected clothing items must be public."
        }, status=400)

    thumbnail = None
    if thumbnail_upload is not None:
        try:
            thumbnail = prepare_uploaded_image(thumbnail_upload)
        except InvalidClothingImage as error:
            return JsonResponse({"error": str(error)}, status=400)

    existing_outfit = None
    if outfit_id not in (None, ""):
        try:
            existing_outfit = Outfit.objects.filter(
                id=outfit_id,
                user=request.user,
            ).first()
        except (ValueError, TypeError):
            existing_outfit = None

        if existing_outfit is None:
            return JsonResponse({"error": "Outfit not found."}, status=404)

    with transaction.atomic():
        if existing_outfit is not None:
            outfit = existing_outfit
            outfit.display_name = name
            outfit.description = description
            outfit.tags = tags
            outfit.price = price
            outfit.publish = publish
            outfit.anonymous = anonymous
            outfit.for_sale = for_sale
            outfit.save(update_fields=[
                "display_name",
                "description",
                "tags",
                "price",
                "publish",
                "anonymous",
                "for_sale",
            ])
            created = False
        else:
            outfit = Outfit.objects.create(
                user=request.user,
                display_name=name,
                description=description,
                tags=tags,
                price=price,
                publish=publish,
                anonymous=anonymous,
                for_sale=for_sale,
            )
            created = True

        outfit.clothing.set(clothing)

        for item in clothing:
            transform = clothing_transforms.get(str(item.pk))

            if transform is not None:
                OutfitClothing.objects.filter(
                    outfit=outfit,
                    clothing=item
                ).update(transform=transform)

        if thumbnail is not None:
            _assign_thumbnail(outfit, thumbnail)

    return JsonResponse({
        "success": True,
        "outfit_id": str(outfit.id),
        "message": (
            "Outfit updated successfully!"
            if not created
            else "Outfit saved successfully!"
        ),
    }, status=200 if not created else 201)


def _parse_save_request(request):
    content_type = (request.content_type or "").split(";")[0].strip().lower()

    if content_type == "multipart/form-data":
        raw = request.POST.get("data", "")
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, TypeError, UnicodeDecodeError):
            return None, None

        if not isinstance(data, dict):
            return None, None

        return data, request.FILES.get("thumbnail")

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, None

    if not isinstance(data, dict):
        return None, None

    return data, None


def _assign_thumbnail(outfit, uploaded_file):
    extension = Path(getattr(uploaded_file, "name", "")).suffix.lower()
    if extension not in {".png", ".jpg", ".jpeg", ".webp"}:
        extension = ".png"

    if outfit.thumbnail:
        outfit.thumbnail.delete(save=False)

    outfit.thumbnail.save(
        f"{outfit.id}_thumbnail{extension}",
        uploaded_file,
        save=True,
    )


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


@login_required
@require_POST
def delete_outfit(request, outfit_id):
    outfit = Outfit.objects.filter(
        id=outfit_id,
        user=request.user
    ).first()

    if outfit is None:
        return JsonResponse(
            {"error": "Outfit not found."},
            status=404
        )

    if outfit.thumbnail:
        outfit.thumbnail.delete(save=False)

    outfit.delete()

    return JsonResponse({
        "success": True,
        "message": "Outfit deleted successfully!"
    })
