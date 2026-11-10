from django.db import migrations, models


def clear_anonymous_when_for_sale(apps, schema_editor):
    Clothing = apps.get_model("clothing", "Clothing")
    Clothing.objects.filter(anonymous=True, for_sale=True).update(anonymous=False)


class Migration(migrations.Migration):

    dependencies = [
        ("clothing", "0011_normalize_clothing_tags"),
    ]

    operations = [
        migrations.RunPython(
            clear_anonymous_when_for_sale,
            migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name="clothing",
            constraint=models.CheckConstraint(
                condition=~(models.Q(anonymous=True) & models.Q(for_sale=True)),
                name="clothing_not_anonymous_and_for_sale",
            ),
        ),
    ]
