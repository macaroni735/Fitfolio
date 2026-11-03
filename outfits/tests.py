from django.contrib.auth.models import User
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
