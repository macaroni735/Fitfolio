from django.db import models
from django.contrib.auth.models import User
from clothing.models import Clothing
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
    tags = models.JSONField(default=list, blank=True)
    clothing = models.ManyToManyField(
        Clothing,
        related_name='outfits',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)