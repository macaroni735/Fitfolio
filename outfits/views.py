from django.shortcuts import render
import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from clothing.models import Clothing
from .models import Outfit


@login_required
@require_POST
def save_outfit(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request."}, status=400)

    name = str(data.get("name", "")).strip()
    description = str(data.get("description", "")).strip()
    clothing_ids = data.get("clothing_ids", [])
    publish = data.get("publish", False)

    if not name or len(name) > 100:
        return JsonResponse({"error": "Enter a valid outfit name."}, status=400)

    if not isinstance(clothing_ids, list) or not clothing_ids:
        return JsonResponse({"error": "Select at least one clothing item."}, status=400)

    if not isinstance(publish, bool):
        return JsonResponse({"error": "Invalid sharing option."}, status=400)

    if len(clothing_ids) != len(set(map(str, clothing_ids))):
        return JsonResponse({"error": "Duplicate clothing items."}, status=400)

    clothing = list(
        Clothing.objects.filter(user=request.user, pk__in=clothing_ids)
    )

    if len(clothing) != len(clothing_ids):
        return JsonResponse({"error": "Invalid clothing selection."}, status=400)

    if publish and any(not item.publish for item in clothing):
        return JsonResponse({
            "error": "To share this outfit, all selected clothing items must be public."
        }, status=400)

    outfit = Outfit.objects.create(
        user=request.user,
        display_name=name,
        description=description,
        publish=publish
    )

    outfit.clothing.set(clothing)

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
