from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from clothing.models import Clothing
from clothing.tags import normalize_tag, normalize_tags
from outfits.models import Outfit


class TagNormalizationTests(TestCase):
    def test_normalize_tag_lowercases_and_collapses_whitespace(self):
        self.assertEqual(normalize_tag("  Street   Wear "), "street wear")
        self.assertEqual(normalize_tag("SUMMER"), "summer")
        self.assertEqual(normalize_tag(""), "")
        self.assertEqual(normalize_tag(None), "")

    def test_normalize_tags_drops_blanks_and_duplicates(self):
        self.assertEqual(
            normalize_tags([" Summer ", "SUMMER", "casual", " casual  chic ", ""]),
            ["summer", "casual", "casual chic"],
        )
        self.assertEqual(normalize_tags(" Vintage, vintage,  street   style "), [
            "vintage",
            "street style",
        ])
        self.assertEqual(normalize_tags(None), [])
        self.assertEqual(normalize_tags(""), [])

    def test_clothing_and_outfit_save_normalize_tags(self):
        user = User.objects.create_user("taguser", password="pass12345")
        clothing = Clothing.objects.create(
            user=user,
            display_name="Blue Jacket",
            tags=["  Vintage ", "vintage", " Casual "],
        )
        outfit = Outfit.objects.create(
            user=user,
            display_name="Weekend Fit",
            tags=[" Summer ", "SUMMER", "  street   wear "],
        )

        clothing.refresh_from_db()
        outfit.refresh_from_db()
        self.assertEqual(clothing.tags, ["vintage", "casual"])
        self.assertEqual(outfit.tags, ["summer", "street wear"])


class AnonymousForSaleConstraintTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("saleuser", password="pass12345")

    def test_clean_rejects_anonymous_and_for_sale(self):
        clothing = Clothing(
            user=self.user,
            display_name="Listed Anon Jacket",
            anonymous=True,
            for_sale=True,
        )
        with self.assertRaises(ValidationError):
            clothing.full_clean()

    def test_database_rejects_anonymous_and_for_sale(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Clothing.objects.create(
                    user=self.user,
                    display_name="Listed Anon Jacket",
                    anonymous=True,
                    for_sale=True,
                )
