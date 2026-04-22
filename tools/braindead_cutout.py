from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


DEFAULT_MODEL = "birefnet-general-lite"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: braindead_cutout.py <input_path> [model]", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).resolve()
    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 2

    model = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL
    output_path = input_path.with_name(f"{input_path.stem}_nobg.png")

    with input_path.open("rb") as file:
        input_bytes = file.read()

    session = new_session(model)
    output_bytes = remove(input_bytes, session=session)
    image = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    image.save(output_path, "PNG")

    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
