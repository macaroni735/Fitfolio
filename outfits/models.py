from django.db import models
from django.contrib.auth.models import User
from clothing.models import Clothing, default_clothing_transform
from clothing.tags import TagsField
import uuid

# Create your models here.
class Outfit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='outfits',
    )
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    tags = TagsField()
    publish = models.BooleanField(default=False)
    clothing = models.ManyToManyField(
        Clothing,
        through="OutfitClothing",
        related_name='outfits',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)


class OutfitClothing(models.Model):
    outfit = models.ForeignKey(
        Outfit,
        on_delete=models.CASCADE,
        related_name="clothing_placements",
    )
    clothing = models.ForeignKey(
        Clothing,
        on_delete=models.CASCADE,
        related_name="outfit_placements",
    )
    transform = models.JSONField(
        default=default_clothing_transform,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["outfit", "clothing"],
                name="unique_outfit_clothing_item",
            ),
        ]