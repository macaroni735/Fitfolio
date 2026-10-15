
import re
from pathlib import Path

from django.core.management.utils import get_random_secret_key


PROJECT_ROOT = Path(__file__).resolve().parent
ENV_PATH = PROJECT_ROOT / ".env"

KEY_PATTERN = re.compile(r"^\s*DJANGO_SECRET_KEY\s*=")

PLACEHOLDER_KEYS = {
    "",
    "your-secret-key-here",
    "your-secret-key",
    "change-me",
    "replace-me",
    "replace-this-secret-key",
    "django-insecure-change-me",
}


def main():
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()
    else:
        lines = []

    key_indexes = [
        i for i, line in enumerate(lines)
        if KEY_PATTERN.match(line)
    ]

    current_key = ""

    if key_indexes:
        value = lines[key_indexes[0]].split("=", 1)[1].strip()
        current_key = value.strip("\"'").strip()

    if key_indexes and current_key.lower() not in PLACEHOLDER_KEYS:
        print("A Django secret key already exists. No changes made.")
        return

    new_key = get_random_secret_key()
    new_line = f"DJANGO_SECRET_KEY='{new_key}'"

    if key_indexes:
        lines[key_indexes[0]] = new_line

        # Remove duplicate DJANGO_SECRET_KEY assignments.
        for i in reversed(key_indexes[1:]):
            del lines[i]
    else:
        if lines and lines[-1].strip():
            lines.append("")
        lines.append(new_line)

    ENV_PATH.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    print("Created or updated .env with a new Django secret key.")


if __name__ == "__main__":
    main()
