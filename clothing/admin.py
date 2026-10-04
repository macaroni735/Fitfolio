from django.contrib import admin
from .models import Clothing
from .services import process_front_image, process_back_image

# Register your models here.
@admin.register(Clothing)

class ClothingAdmin(admin.ModelAdmin):
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)

        if "original_front_image" in form.changed_data:
            process_front_image(obj)
        if "original_back_image" in form.changed_data:
            process_back_image(obj)