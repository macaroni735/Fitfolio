from django.db import models
from django.contrib.auth.models import User
import uuid

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
    category = models.CharField(max_length=50)
    gender = models.CharField(max_length=50, blank=True)
    size = models.CharField(max_length=20, blank=True)
    tags = models.JSONField(default=list, blank=True)
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
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        )
    created_at = models.DateTimeField(auto_now_add=True)
    