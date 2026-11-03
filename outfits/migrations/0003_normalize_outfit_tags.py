from django.db import migrations

import clothing.tags


def normalize_existing_outfit_tags(apps, schema_editor):
    Outfit = apps.get_model("outfits", "Outfit")
    updates = []

    for item in Outfit.objects.iterator():
        normalized = clothing.tags.normalize_tags(item.tags)
        if item.tags != normalized:
            item.tags = normalized
            updates.append(item)

    if updates:
        Outfit.objects.bulk_update(updates, ["tags"], batch_size=200)


class Migration(migrations.Migration):

    dependencies = [
        ("outfits", "0002_outfit_publish"),
    ]

    operations = [
        migrations.AlterField(
            model_name="outfit",
            name="tags",
            field=clothing.tags.TagsField(blank=True, default=list),
        ),
        migrations.RunPython(
            normalize_existing_outfit_tags,
            migrations.RunPython.noop,
        ),
    ]
