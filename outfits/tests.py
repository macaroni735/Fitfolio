from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

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
