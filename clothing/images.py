from io import BytesIO
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, UnidentifiedImageError

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}
MAX_IMAGE_DIMENSION = 1600
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_SOURCE_BYTES = 50 * 1024 * 1024


class InvalidClothingImage(ValueError):
    pass


def prepare_uploaded_image(uploaded_file, *, required=True):
    if uploaded_file is None:
        if required:
            raise InvalidClothingImage("Please upload a valid image.")
        return None

    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()
    if content_type == "image/jpg":
        content_type = "image/jpeg"

    if content_type and content_type not in ALLOWED_IMAGE_TYPES:
        raise InvalidClothingImage("Please upload a JPEG, PNG, or WebP image.")

    size = getattr(uploaded_file, "size", None)
    if size and size > MAX_SOURCE_BYTES:
        raise InvalidClothingImage("That image is too large to process.")

    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    try:
        with Image.open(uploaded_file) as opened:
            image = opened.convert("RGBA") if "A" in opened.getbands() else opened.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise InvalidClothingImage("Please upload a valid image.") from error

    needs_resize = max(image.size) > MAX_IMAGE_DIMENSION
    too_heavy = bool(size and size > MAX_IMAGE_BYTES)
    if (
        not needs_resize
        and not too_heavy
        and content_type in ALLOWED_IMAGE_TYPES
    ):
        if hasattr(uploaded_file, "seek"):
            uploaded_file.seek(0)
        return uploaded_file

    if needs_resize:
        image.thumbnail(
            (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
            Image.Resampling.LANCZOS,
        )

    original_name = Path(getattr(uploaded_file, "name", "") or "image").stem or "image"
    data, content_type, extension = _encode_image(image, content_type)

    return SimpleUploadedFile(
        f"{original_name}{extension}",
        data,
        content_type=content_type,
    )


def _encode_image(image, source_type):
    keep_png = image.mode == "RGBA" or source_type in {"image/png", "image/webp"}
    if keep_png:
        buffer = BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        data = buffer.getvalue()
        if len(data) <= MAX_IMAGE_BYTES:
            return data, "image/png", ".png"

    rgb = image.convert("RGB")
    for quality in (90, 80, 70, 60, 50, 40):
        buffer = BytesIO()
        rgb.save(buffer, format="JPEG", quality=quality, optimize=True)
        data = buffer.getvalue()
        if len(data) <= MAX_IMAGE_BYTES:
            return data, "image/jpeg", ".jpg"

    raise InvalidClothingImage(
        "That image is still too large after resizing. Please try a smaller photo.",
    )
