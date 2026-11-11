import json
from io import BytesIO

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import Client, TestCase
from PIL import Image

from clothing.models import Clothing, default_clothing_transform
from outfits.models import Outfit, OutfitClothing


class OutfitClothingPlacementTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("outfituser", password="pass12345")
        self.shirt = Clothing.objects.create(
            user=self.user,
            display_name="Shirt",
            transform={"x": 0.4, "y": 0.6, "rotation": 15, "scale": 1.2},
        )
        self.outfit = Outfit.objects.create(
            user=self.user,
            display_name="Weekend Fit",
        )

    def test_set_creates_placement_with_default_transform(self):
        self.outfit.clothing.set([self.shirt])
        placement = OutfitClothing.objects.get(
            outfit=self.outfit,
            clothing=self.shirt,
        )
        self.assertEqual(placement.transform, default_clothing_transform())

    def test_same_clothing_cannot_appear_twice_in_an_outfit(self):
        OutfitClothing.objects.create(outfit=self.outfit, clothing=self.shirt)
        with self.assertRaises(IntegrityError):
            OutfitClothing.objects.create(outfit=self.outfit, clothing=self.shirt)


class OutfitSaleConstraintTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("saleuser", password="pass12345")

    def test_clean_rejects_anonymous_and_for_sale(self):
        outfit = Outfit(
            user=self.user,
            display_name="Street Look",
            anonymous=True,
            for_sale=True,
        )
        with self.assertRaises(ValidationError):
            outfit.full_clean()

    def test_database_rejects_anonymous_and_for_sale(self):
        with self.assertRaises(IntegrityError):
            Outfit.objects.create(
                user=self.user,
                display_name="Street Look",
                anonymous=True,
                for_sale=True,
            )


class OutfitThumbnailSaveTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("thumbuser", password="pass12345")
        self.client = Client()
        self.client.login(username="thumbuser", password="pass12345")
        self.shirt = Clothing.objects.create(
            user=self.user,
            display_name="Tee",
            publish=True,
        )

    def _png_upload(self, name="thumb.png", color=(240, 200, 220, 255)):
        buffer = BytesIO()
        Image.new("RGBA", (60, 80), color).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_save_stores_and_replaces_thumbnail(self):
        payload = {
            "name": "Brunch Fit",
            "description": "",
            "clothing_ids": [str(self.shirt.id)],
            "clothing_transforms": {
                str(self.shirt.id): {
                    "x": 0.5,
                    "y": 0.5,
                    "rotation": 0,
                    "scale": 1,
                },
            },
            "tags": ["casual"],
            "publish": False,
            "anonymous": False,
            "for_sale": False,
            "price": "",
        }

        create_response = self.client.post(
            "/outfits/save/",
            data={
                "data": json.dumps(payload),
                "thumbnail": self._png_upload("first.png"),
            },
        )
        self.assertEqual(create_response.status_code, 201)
        outfit = Outfit.objects.get(id=create_response.json()["outfit_id"])
        self.assertTrue(outfit.thumbnail)
        with outfit.thumbnail.open("rb") as handle:
            first_bytes = handle.read()

        payload["outfit_id"] = str(outfit.id)
        update_response = self.client.post(
            "/outfits/save/",
            data={
                "data": json.dumps(payload),
                "thumbnail": self._png_upload("second.png", color=(180, 220, 190, 255)),
            },
        )
        self.assertEqual(update_response.status_code, 200)
        outfit.refresh_from_db()
        self.assertTrue(outfit.thumbnail)
        with outfit.thumbnail.open("rb") as handle:
            second_bytes = handle.read()
        self.assertNotEqual(first_bytes, second_bytes)
