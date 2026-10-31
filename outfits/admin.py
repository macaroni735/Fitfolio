from django.contrib import admin
from .models import Outfit, OutfitClothing


class OutfitClothingInline(admin.TabularInline):
    model = OutfitClothing
    extra = 0


@admin.register(Outfit)
class OutfitAdmin(admin.ModelAdmin):
    inlines = [OutfitClothingInline]