from django.core.exceptions import ValidationError
from django.db import models
from django.contrib.auth.models import User
from clothing.models import Clothing, default_clothing_transform
from clothing.tags import TagsField
import uuid

CATEGORY_CHOICES = [
    ("womens", "Women's"),
    ("mens", "Men's"),
    ("unisex", "Unisex"),
    ("kids", "Kids"),
]


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
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default="unisex",
    )
    tags = TagsField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    publish = models.BooleanField(default=False)
    anonymous = models.BooleanField(default=False)
    for_sale = models.BooleanField(default=False)
    thumbnail = models.ImageField(
        upload_to="outfits/thumbnails/",
        blank=True,
    )
    clothing = models.ManyToManyField(
        Clothing,
        through="OutfitClothing",
        related_name='outfits',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~(models.Q(anonymous=True) & models.Q(for_sale=True)),
                name="outfit_not_anonymous_and_for_sale",
            ),
        ]

    def clean(self):
        super().clean()
        if self.anonymous and self.for_sale:
            raise ValidationError(
                "Anonymous and For Sale can't both be enabled.",
            )


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
