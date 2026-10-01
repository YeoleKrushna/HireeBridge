"""Generate GreyRocks internship certificates from the supplied master template.

Senior-calibrated renderer:
- Uses the supplied master as the immutable base.
- Calibrates dynamic content against the approved 1491x1055 reference.
- Repositions the master metadata labels/separators and the lower divider
  so the final output follows the approved reference layout.
- Uses bounding-box based fitting so variable values stay inside their columns.
"""

import argparse
import re
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont


NAVY = "#0B1F36"
GOLD = "#C99A3E"
REFERENCE_SIZE = (1491, 1055)
WINDOWS_FONTS = Path("C:/Windows/Fonts")


def sanitize_credential_id(raw_id):
    """Return a filename-safe, stable credential ID for Windows/POSIX output."""
    value = str(raw_id or "").strip()
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value[:64].upper()


def load_font(names, size):
    size = max(1, int(size))
    for name in names:
        path = WINDOWS_FONTS / name
        if path.exists():
            return ImageFont.truetype(str(path), size)

    fallback_dirs = (
        Path("/usr/share/fonts/truetype/dejavu"),
        Path("/usr/share/fonts/truetype/liberation2"),
    )
    fallback_names = (
        ("DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf")
        if any((d / "DejaVuSerif.ttf").exists() for d in fallback_dirs)
        else ("LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf")
    )
    for directory in fallback_dirs:
        for fallback_name in fallback_names:
            path = directory / fallback_name
            if path.exists():
                return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


def text_bbox(draw, text, font):
    box = draw.textbbox((0, 0), str(text), font=font)
    return box


def text_width(draw, text, font):
    box = text_bbox(draw, text, font)
    return box[2] - box[0]


def text_height(draw, text, font):
    box = text_bbox(draw, text, font)
    return box[3] - box[1]


def draw_centered(draw, text, center_x, center_y, font, fill=NAVY):
    """Center text by its real Pillow bounding box, including font offsets."""
    text = str(text)
    box = text_bbox(draw, text, font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    x = center_x - width / 2 - box[0]
    y = center_y - height / 2 - box[1]
    draw.text((x, y), text, font=font, fill=fill)


def fit_font(draw, text, names, max_size, min_size, max_width):
    max_size = max(1, int(max_size))
    min_size = max(1, int(min_size))
    max_width = max(1, int(max_width))
    for size in range(max_size, min_size - 1, -1):
        font = load_font(names, size)
        if text_width(draw, text, font) <= max_width:
            return font
    return load_font(names, min_size)


def draw_rich_centered(draw, parts, center_x, center_y, regular_font, bold_font):
    widths = []
    heights = []
    for text, bold in parts:
        font = bold_font if bold else regular_font
        box = text_bbox(draw, text, font)
        widths.append(box[2] - box[0])
        heights.append(box[3] - box[1])

    total_width = sum(widths)
    # Use the maximum glyph-height around a common vertical center.
    max_height = max(heights) if heights else 1
    x = center_x - total_width / 2

    for (text, bold), width in zip(parts, widths):
        font = bold_font if bold else regular_font
        box = text_bbox(draw, text, font)
        y = center_y - max_height / 2 - box[1] + (max_height - (box[3] - box[1])) / 2
        draw.text((x - box[0], y), text, font=font, fill=NAVY)
        x += width


def scaled(value, factor):
    return int(round(value * factor))


def detect_horizontal_gold_line(image):
    """Return the longest central gold line in the certificate body."""
    import numpy as np

    arr = np.asarray(image.convert("RGB"))
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)

    gold = (
        (r > 160)
        & (g > 95)
        & (g < 235)
        & (b < 175)
        & ((r - g) > 10)
        & ((g - b) > 5)
    )

    x_min, x_max = 350, 1150
    y_min, y_max = 510, 600
    best = None

    for y in range(y_min, y_max):
        xs = np.where(gold[y, x_min:x_max])[0] + x_min
        if len(xs) < 250:
            continue

        start = prev = int(xs[0])
        runs = []
        for x in xs[1:]:
            x = int(x)
            if x <= prev + 1:
                prev = x
            else:
                runs.append((start, prev))
                start = prev = x
        runs.append((start, prev))

        run = max(runs, key=lambda p: p[1] - p[0])
        length = run[1] - run[0] + 1
        if best is None or length > best[0]:
            best = (length, run[0], run[1] + 1, y)

    return best  # length, x1, x2, y


def erase_with_vertical_interpolation(image, box):
    """Erase a small overlay from a nearly uniform certificate background."""
    x1, y1, x2, y2 = [int(v) for v in box]
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(image.width, x2)
    y2 = min(image.height, y2)
    if x2 <= x1 or y2 <= y1:
        return

    pixels = image.load()
    pad = max(3, min(10, (y2 - y1) // 2))
    upper_y = max(0, y1 - pad)
    lower_y = min(image.height - 1, y2 + pad)

    span = max(1, lower_y - upper_y)
    for y in range(y1, y2):
        t = (y - upper_y) / span
        for x in range(x1, x2):
            upper = pixels[x, upper_y]
            lower = pixels[x, lower_y]
            pixels[x, y] = tuple(
                int(round(upper[c] * (1 - t) + lower[c] * t))
                for c in range(3)
            )


def move_horizontal_line(image, target_y):
    detected = detect_horizontal_gold_line(image)
    if not detected:
        return

    _, x1, x2, source_y = detected
    # Preserve the exact static line pixels from the master.
    top = max(0, source_y - 1)
    bottom = min(image.height, source_y + 2)
    patch = image.crop((x1, top, x2, bottom))

    erase_with_vertical_interpolation(
        image,
        (x1 - 2, top - 2, x2 + 2, bottom + 2),
    )

    target_top = int(round(target_y - patch.height / 2))
    image.paste(patch, (x1, target_top))


def find_dark_bbox(image, roi, threshold=180):
    import numpy as np

    x1, y1, x2, y2 = roi
    arr = np.asarray(image.convert("RGB"))
    sub = arr[y1:y2, x1:x2]
    mask = np.all(sub < threshold, axis=2)

    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return (
        int(x1 + xs.min()),
        int(y1 + ys.min()),
        int(x1 + xs.max() + 1),
        int(y1 + ys.max() + 1),
    )


def move_static_text(image, source_roi, target_center_x, target_center_y):
    bbox = find_dark_bbox(image, source_roi)
    if not bbox:
        return

    x1, y1, x2, y2 = bbox
    pad = 3
    src_box = (
        max(0, x1 - pad),
        max(0, y1 - pad),
        min(image.width, x2 + pad),
        min(image.height, y2 + pad),
    )

    patch = image.crop(src_box)
    erase_with_vertical_interpolation(image, src_box)

    patch_w, patch_h = patch.size
    target_x = int(round(target_center_x - patch_w / 2))
    target_y = int(round(target_center_y - patch_h / 2))
    image.paste(patch, (target_x, target_y))


def move_static_vertical_separator(image, source_roi, target_x, target_y_center):
    import numpy as np

    x1, y1, x2, y2 = source_roi
    arr = np.asarray(image.convert("RGB"))
    sub = arr[y1:y2, x1:x2]
    r = sub[:, :, 0].astype(int)
    g = sub[:, :, 1].astype(int)
    b = sub[:, :, 2].astype(int)
    score = (r - g) + (g - b)
    gold = score > 30

    candidates = []
    for local_x in range(gold.shape[1]):
        ys = np.where(gold[:, local_x])[0]
        if len(ys) < 25:
            continue

        # Longest vertical run.
        start = prev = int(ys[0])
        runs = []
        for yy in ys[1:]:
            yy = int(yy)
            if yy <= prev + 1:
                prev = yy
            else:
                runs.append((start, prev))
                start = prev = yy
        runs.append((start, prev))
        run = max(runs, key=lambda p: p[1] - p[0])
        length = run[1] - run[0] + 1
        candidates.append((length, x1 + local_x, y1 + run[0], y1 + run[1] + 1))

    if not candidates:
        return

    _, source_x, source_top, source_bottom = max(candidates, key=lambda p: p[0])
    src_box = (
        max(0, source_x - 1),
        max(0, source_top - 1),
        min(image.width, source_x + 2),
        min(image.height, source_bottom + 1),
    )
    patch = image.crop(src_box)
    erase_with_vertical_interpolation(image, src_box)

    target_x_left = int(round(target_x - patch.width / 2))
    target_top = int(round(target_y_center - patch.height / 2))
    image.paste(patch, (target_x_left, target_top))


def move_metadata_to_reference(image):
    """Move the master labels/separators to the positions used by the approved reference.

    Coordinates are in the actual 1491x1055 master/reference space and then scaled
    proportionally if another resolution is supplied.
    """
    w, h = image.size
    sx = w / REFERENCE_SIZE[0]
    sy = h / REFERENCE_SIZE[1]

    def X(v):
        return scaled(v, sx)

    def Y(v):
        return scaled(v, sy)

    # Source ROIs cover the original master label positions.
    labels = [
        ((250, 675, 400, 720), 324, 717),     # Duration
        ((480, 675, 640, 720), 561, 718),     # Domain
        ((700, 675, 880, 720), 815, 719),     # Issue Date
        ((990, 675, 1200, 720), 1103, 718),   # Credential ID
    ]

    for roi, tx, ty in labels:
        scaled_roi = tuple(
            [
                X(roi[0]),
                Y(roi[1]),
                X(roi[2]),
                Y(roi[3]),
            ]
        )
        move_static_text(image, scaled_roi, X(tx), Y(ty))

    # Move the three metadata dividers.
    separators = [
        ((415, 660, 440, 770), 430, 737),
        ((670, 660, 700, 770), 691, 738),
        ((885, 660, 915, 770), 937, 738),
    ]
    for roi, tx, ty in separators:
        scaled_roi = tuple(
            [
                X(roi[0]),
                Y(roi[1]),
                X(roi[2]),
                Y(roi[3]),
            ]
        )
        move_static_vertical_separator(image, scaled_roi, X(tx), Y(ty))


def main():
    parser = argparse.ArgumentParser(
        description="Generate GreyRocks internship certificate."
    )
    parser.add_argument("--name", required=True)
    parser.add_argument("--domain", required=True)
    parser.add_argument("--duration", required=True)
    parser.add_argument("--id", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--template", required=True)
    parser.add_argument("--outdir", required=True)
    args = parser.parse_args()

    credential_id = sanitize_credential_id(args.id)
    if not credential_id:
        raise ValueError("Credential ID contains no valid filename-safe characters.")

    template = Path(args.template).resolve()
    outdir = Path(args.outdir).resolve()

    if not template.is_file():
        raise FileNotFoundError(f"Certificate template not found: {template}")

    outdir.mkdir(parents=True, exist_ok=True)

    image = Image.open(template).convert("RGB")
    if image.width <= 0 or image.height <= 0:
        raise RuntimeError("Invalid certificate template dimensions.")

    # All calibration is defined in the actual high-quality master space.
    w, h = image.size
    sx = w / REFERENCE_SIZE[0]
    sy = h / REFERENCE_SIZE[1]
    scale = min(sx, sy)

    def X(v):
        return scaled(v, sx)

    def Y(v):
        return scaled(v, sy)

    def S(v):
        return max(1, scaled(v, scale))

    serif = ["times.ttf", "timesnr.ttf", "Times New Roman.ttf"]
    serif_bold = ["timesbd.ttf", "Times New Roman Bold.ttf"]

    # ------------------------------------------------------------------
    # 1. STATIC LAYOUT CALIBRATION
    # ------------------------------------------------------------------
    # The supplied blank master has the lower name divider and metadata
    # row slightly above the approved reference. Move only those static
    # elements in the generated copy; the master file itself is untouched.
    move_horizontal_line(image, Y(543))

    draw = ImageDraw.Draw(image)
    center_x = X(745.5)

    # ------------------------------------------------------------------
    # 2. INTRO + STUDENT NAME
    # ------------------------------------------------------------------
    intro_font = load_font(serif, S(36))
    name_font = fit_font(
        draw,
        args.name.strip(),
        serif_bold,
        S(76),
        S(46),
        X(780),
    )

    draw_centered(
        draw,
        "This is to certify that",
        center_x,
        Y(445),
        intro_font,
    )

    draw_centered(
        draw,
        args.name.strip(),
        center_x,
        Y(497),
        name_font,
    )

    # ------------------------------------------------------------------
    # 3. COMPLETION PARAGRAPH
    # ------------------------------------------------------------------
    domain = args.domain.strip()

    # Fixed three-line layout. The wording is preserved in full and only the
    # domain segment is bold.
    lines = [
        [
            ("has successfully completed a ", False),
            (domain, True),
            (" internship with GreyRocks. During this internship,", False),
        ],
        [
            (
                "the candidate has worked on real-world projects, completed all assigned tasks and assessments,",
                False,
            ),
        ],
        [
            (
                "and demonstrated a strong understanding of key concepts and practical applications required in the domain.",
                False,
            ),
        ],
    ]

    # Keep the normal certificate paragraph size. Only scale down when a
    # very unusual domain would make the first line exceed the safe envelope.
    max_paragraph_width = X(1070)
    paragraph_max = S(37)
    paragraph_min = S(23)

    for size in range(paragraph_max, paragraph_min - 1, -1):
        regular = load_font(serif, size)
        bold = load_font(serif_bold, size)
        widths = [
            sum(
                text_width(draw, txt, bold if is_bold else regular)
                for txt, is_bold in parts
            )
            for parts in lines
        ]
        if max(widths) <= max_paragraph_width:
            break

    paragraph_centers = [575, 608, 641]
    for parts, cy in zip(lines, paragraph_centers):
        draw_rich_centered(
            draw,
            parts,
            center_x,
            Y(cy),
            regular,
            bold,
        )


    # ------------------------------------------------------------------
    # 4. METADATA VALUES
    # ------------------------------------------------------------------
    # All metadata values use the SAME font size. A long value wraps to two
    # lines instead of being shrunk. This keeps a domain such as
    # "Forward Deployed Engineer" visually consistent with every other value.
    metadata = [
        ("duration", args.duration.strip(), 324, 737, 190),
        ("domain", domain, 558, 737, 245),
        ("date", args.date.strip(), 794, 737, 210),
        ("credential", credential_id, 1101, 737, 300),
    ]

    # Calibrated to the value size in the supplied approved reference.
    value_font = load_font(serif_bold, S(24))

    def wrap_metadata(value, max_width):
        value = " ".join(str(value).split())

        if text_width(draw, value, value_font) <= X(max_width):
            return [value]

        words = value.split()
        if len(words) < 2:
            return [value]

        fits = []
        for split_at in range(1, len(words)):
            left = " ".join(words[:split_at])
            right = " ".join(words[split_at:])
            lw = text_width(draw, left, value_font)
            rw = text_width(draw, right, value_font)
            if lw <= X(max_width) and rw <= X(max_width):
                fits.append((abs(lw - rw), left, right))

        if fits:
            _, left, right = min(fits, key=lambda item: item[0])
            return [left, right]

        # Safety fallback: choose the split with the smallest maximum overflow.
        best = None
        for split_at in range(1, len(words)):
            left = " ".join(words[:split_at])
            right = " ".join(words[split_at:])
            overflow = max(
                0,
                text_width(draw, left, value_font) - X(max_width),
                text_width(draw, right, value_font) - X(max_width),
            )
            candidate = (overflow, left, right)
            if best is None or candidate[0] < best[0]:
                best = candidate

        return [best[1], best[2]]

    def draw_metadata_value(value, cx, cy, max_width):
        value_lines = wrap_metadata(value, max_width)

        if len(value_lines) == 1:
            draw_centered(draw, value_lines[0], X(cx), Y(cy), value_font)
            return

        # Same font size on both lines; the two-line block is centered on the
        # original metadata anchor.
        gap = S(28)
        draw_centered(
            draw,
            value_lines[0],
            X(cx),
            Y(cy) - gap // 2,
            value_font,
        )
        draw_centered(
            draw,
            value_lines[1],
            X(cx),
            Y(cy) + gap // 2,
            value_font,
        )

    for _, value, cx, cy, max_width in metadata:
        draw_metadata_value(value, cx, cy, max_width)


    # ------------------------------------------------------------------
    # 5. VERIFICATION QR
    # ------------------------------------------------------------------
    verification_url = (
        f"https://greyrocks.in/verification/{credential_id}"
    )

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    qr_image = qr.make_image(
        fill_color="black",
        back_color="white",
    ).convert("RGB")

    # Actual high-quality master QR frame is ~142x140px at
    # x=973..1119, y=789..930. Keep the QR smaller than the frame,
    # centered, and optically lowered by a few pixels.
    qr_size = S(116)
    qr_image = qr_image.resize(
        (qr_size, qr_size),
        Image.Resampling.NEAREST,
    )

    frame_left = X(973)
    frame_top = Y(789)
    frame_right = X(1119)
    frame_bottom = Y(930)

    qr_x = frame_left + (frame_right - frame_left - qr_size) // 2
    qr_y = frame_top + (frame_bottom - frame_top - qr_size) // 2 + Y(5)
    qr_y = min(qr_y, frame_bottom - qr_size)

    image.paste(qr_image, (qr_x, qr_y))

    # ------------------------------------------------------------------
    # 6. VERIFICATION CREDENTIAL ID
    # ------------------------------------------------------------------
    # Match the existing URL line: regular serif, same navy color, same
    # left alignment. The ID sits directly below the URL.
    verification_font = load_font(serif, S(18))
    verification_id = credential_id
    # Match the actual left edge of the master "greyrocks.in/verification/" text.
    # Measured from the 1491x1055 master: x ~= 1147.
    verification_x = X(1178)
    verification_y = Y(900)
    verification_max_width = X(245)

    if text_width(draw, verification_id, verification_font) <= verification_max_width:
        draw.text(
            (verification_x, verification_y),
            verification_id,
            font=verification_font,
            fill=NAVY,
        )
    else:
        # Keep the same font size and wrap rather than enlarging/shrinking.
        words = verification_id.replace("-", " -").split()
        lines_id = [verification_id]
        if len(words) > 1:
            candidates = []
            for split_at in range(1, len(words)):
                left = " ".join(words[:split_at]).replace(" -", "-")
                right = " ".join(words[split_at:]).replace(" -", "-")
                if (
                    text_width(draw, left, verification_font) <= verification_max_width
                    and text_width(draw, right, verification_font) <= verification_max_width
                ):
                    candidates.append((abs(text_width(draw, left, verification_font) - text_width(draw, right, verification_font)), left, right))
            if candidates:
                _, left, right = min(candidates, key=lambda item: item[0])
                lines_id = [left, right]

        for i, line in enumerate(lines_id):
            draw.text(
                (verification_x, verification_y + Y(i * 21)),
                line,
                font=verification_font,
                fill=NAVY,
            )


    # ------------------------------------------------------------------
    # 7. OUTPUT
    # ------------------------------------------------------------------
    jpg_path = outdir / f"{credential_id}.jpg"
    pdf_path = outdir / f"{credential_id}.pdf"

    image.save(
        jpg_path,
        "JPEG",
        quality=98,
        subsampling=0,
        optimize=True,
    )
    image.save(
        pdf_path,
        "PDF",
        resolution=300.0,
    )

    for path in (jpg_path, pdf_path):
        if not path.is_file() or path.stat().st_size == 0:
            raise RuntimeError(
                f"Certificate output missing or empty: {path}"
            )

    print(f"JPG: {jpg_path}")
    print(f"PDF: {pdf_path}")
    print(f"QR:  {verification_url}")


if __name__ == "__main__":
    main()
