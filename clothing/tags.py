from django.db import models


def normalize_tag(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.split()).lower()


def normalize_tags(value):
    if value is None or value == "":
        return []

    if isinstance(value, str):
        items = value.split(",")
    elif isinstance(value, (list, tuple)):
        items = value
    else:
        return []

    tags = []
    seen = set()
    for item in items:
        tag = normalize_tag(item)
        if tag and tag not in seen:
            tags.append(tag)
            seen.add(tag)
    return tags


class TagsField(models.JSONField):
    description = "A list of unique lowercase tags"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("default", list)
        kwargs.setdefault("blank", True)
        super().__init__(*args, **kwargs)

    def to_python(self, value):
        return normalize_tags(super().to_python(value))

    def get_prep_value(self, value):
        return super().get_prep_value(normalize_tags(value))

    def pre_save(self, model_instance, add):
        value = normalize_tags(getattr(model_instance, self.attname))
        setattr(model_instance, self.attname, value)
        return super().pre_save(model_instance, add)

    def validate(self, value, model_instance):
        super().validate(normalize_tags(value), model_instance)
