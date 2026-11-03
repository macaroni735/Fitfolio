from django.db import models
from django.contrib.auth.models import User
import uuid

from .tags import TagsField


def default_clothing_transform():
    return {
        "x": 0.5,
        "y": 0.5,
        "rotation": 0,
        "scale": 1,
    }


# Create your models here.
class Clothing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='clothing_items',
    )
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, default="unisex")
    article_type = models.CharField(max_length=50, default="other", blank=True)
    size = models.CharField(max_length=20, blank=True)
    tags = TagsField()
    count = models.PositiveIntegerField(default=1)
    original_front_image = models.ImageField(
        upload_to='clothing/',
        blank=True,
    )
    original_back_image = models.ImageField(
        upload_to='clothing/',
        blank=True,
    )
    processed_front_image = models.ImageField(
        upload_to='clothing/processed/',
        blank=True,
    )
    processed_back_image = models.ImageField(
        upload_to='clothing/processed/',
        blank=True,
    )
    final_front_image = models.ImageField(
        upload_to='clothing/final/',
        blank=True,
    )
    final_back_image = models.ImageField(
        upload_to='clothing/final/',
        blank=True,
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    publish = models.BooleanField(default=False)
    anonymous = models.BooleanField(default=False)
    for_sale = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=1)
    transform = models.JSONField(default=default_clothing_transform, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ClothingGalleryImage(models.Model):
    clothing = models.ForeignKey(
        Clothing,
        on_delete=models.CASCADE,
        related_name="gallery_images",
    )
    image = models.ImageField(upload_to="clothing/gallery/")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
 