from django.db import migrations

import clothing.tags


def normalize_existing_clothing_tags(apps, schema_editor):
    Clothing = apps.get_model("clothing", "Clothing")
    updates = []

    for item in Clothing.objects.iterator():
        normalized = clothing.tags.normalize_tags(item.tags)
        if item.tags != normalized:
            item.tags = normalized
            updates.append(item)

    if updates:
        Clothing.objects.bulk_update(updates, ["tags"], batch_size=200)


class Migration(migrations.Migration):

    dependencies = [
        ("clothing", "0010_clothing_gallery_images"),
    ]

    operations = [
        migrations.AlterField(
            model_name="clothing",
            name="tags",
            field=clothing.tags.TagsField(blank=True, default=list),
        ),
        migrations.RunPython(
            normalize_existing_clothing_tags,
            migrations.RunPython.noop,
        ),
    ]
