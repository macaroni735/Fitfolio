from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from clothing.models import Clothing
from outfits.models import Outfit
import uuid

# Create your models here.
class Rating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ratings',
    )
    clothing = models.ForeignKey(
        Clothing,
        on_delete=models.CASCADE,
        related_name='ratings',
        null=True,
        blank=True,
    )
    outfit = models.ForeignKey(
        Outfit,
        on_delete=models.CASCADE,
        related_name='ratings',
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(clothing__isnull=False, outfit__isnull=True)
                    | models.Q(clothing__isnull=True, outfit__isnull=False)
                ),
                name="rating_has_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=['user', 'clothing'],
                condition=models.Q(clothing__isnull=False),
                name="unique_clothing_rating",
            ),
            models.UniqueConstraint(
                fields=['user', 'outfit'],
                condition=models.Q(outfit__isnull=False),
                name="unique_outfit_rating",
            ),
        ]