from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_POST

from .services import remove_background_from_upload


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