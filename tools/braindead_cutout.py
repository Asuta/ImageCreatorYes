from __future__ import annotations

import io
import os
import sys
from pathlib import Path

from PIL import Image
import onnxruntime as ort
from rembg import new_session, remove


DEFAULT_MODEL = "birefnet-general-lite"
DEFAULT_DEVICE = "auto"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: braindead_cutout.py <input_path> [model]", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).resolve()
    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 2

    model = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL
    device = os.environ.get("BRAINDEAD_BG_DEVICE", DEFAULT_DEVICE).strip().lower() or DEFAULT_DEVICE
    output_path = input_path.with_name(f"{input_path.stem}_nobg.png")

    # Load CUDA/cuDNN DLLs from Python-installed NVIDIA runtime packages when available.
    ort.preload_dlls(directory="")

    with input_path.open("rb") as file:
        input_bytes = file.read()

    providers = select_providers(device)
    print(f"Using providers: {providers}", file=sys.stderr)
    session = new_session(model, providers=providers)
    output_bytes = remove(input_bytes, session=session)
    image = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
    image.save(output_path, "PNG")

    print(output_path)
    return 0


def select_providers(device: str) -> list[str]:
    available = ort.get_available_providers()

    if device == "cpu":
        return ["CPUExecutionProvider"]

    if device == "gpu":
        if "CUDAExecutionProvider" not in available:
            raise RuntimeError(
                f"GPU mode requested but CUDAExecutionProvider is unavailable. Available providers: {available}"
            )
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]

    if device == "auto":
        if "CUDAExecutionProvider" in available:
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        return ["CPUExecutionProvider"]

    raise RuntimeError("BRAINDEAD_BG_DEVICE must be one of: auto, gpu, cpu")


if __name__ == "__main__":
    raise SystemExit(main())
