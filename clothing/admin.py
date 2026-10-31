from django.contrib import admin
from .models import Clothing, ClothingGalleryImage
from .services import process_front_image, process_back_image


class ClothingGalleryImageInline(admin.TabularInline):
    model = ClothingGalleryImage
    extra = 0


@admin.register(Clothing)
class ClothingAdmin(admin.ModelAdmin):
    inlines = [ClothingGalleryImageInline]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        if "original_front_image" in form.changed_data:
            process_front_image(obj)
        if "original_back_image" in form.changed_data:
            process_back_image(obj)