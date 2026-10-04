from django.core.files.base import ContentFile
from rembg import remove
from pathlib import Path

def process_front_image(clothing):
    _process_image(clothing, clothing.original_front_image, "processed_front_image")

def process_back_image(clothing):
    _process_image(clothing, clothing.original_back_image, "processed_back_image")

def _process_image(clothing, original_image, processed_field):
    if not original_image:
        return

    with original_image.open("rb") as image_file:
        image_data = image_file.read()
    
    processed_image = remove(image_data)

    original_name = Path(original_image.name).stem

    getattr(clothing, processed_field).save(
        f"processed_{original_name}.png",
        ContentFile(processed_image),
        save=False,
    )

    clothing.save(update_fields=[processed_field])