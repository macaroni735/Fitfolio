
import json
import math

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.db import transaction

from clothing.models import Clothing
from .models import Outfit, OutfitClothing


@login_required
@require_POST
def save_outfit(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    clothing_ids = data.get("clothing_ids", [])
    clothing_transforms = data.get("clothing_transforms", {})
    publish = data.get("publish", False)

    if not name or len(name) > 100:
        return JsonResponse({"error": "Enter a valid outfit name."}, status=400)

    if not isinstance(clothing_ids, list) or not clothing_ids:
        return JsonResponse({"error": "Select at least one clothing item."}, status=400)

    if not isinstance(publish, bool):
        return JsonResponse({"error": "Invalid sharing option."}, status=400)

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

    with transaction.atomic():
        outfit = Outfit.objects.create(
            user=request.user,
            display_name=name,
            description=description,
            publish=publish
        )

        outfit.clothing.set(clothing)

        for item in clothing:
            transform = clothing_transforms.get(str(item.pk))

            if transform is not None:
                OutfitClothing.objects.filter(
                    outfit=outfit,
                    clothing=item
                ).update(transform=transform)

    return JsonResponse({
        "success": True,
        "outfit_id": str(outfit.id),
        "message": "Outfit saved successfully!"
    }, status=201)


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

    outfit.delete()

    return JsonResponse({
        "success": True,
        "message": "Outfit deleted successfully!"
    })
