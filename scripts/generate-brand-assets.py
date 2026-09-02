"""Generate raster DemandLint brand assets from the validated two-color mark."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
NAVY = "#172033"
INDIGO = "#596DE0"
WHITE = "#FFFFFF"
MUTED = "#C5CEE3"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def rounded_rect(draw: ImageDraw.ImageDraw, scale: float, box, radius: float, fill: str) -> None:
    draw.rounded_rectangle(tuple(round(value * scale) for value in box), radius=round(radius * scale), fill=fill)


def bezier_points(scale: float):
    p0, p1, p2, p3 = (75, 8), (90, 8), (98, 18), (98, 32)
    p4, p5, p6 = (98, 46), (90, 56), (75, 56)
    points = []
    for control in ((p0, p1, p2, p3), (p3, p4, p5, p6)):
        for step in range(33):
            t = step / 32
            inverse = 1 - t
            x = inverse ** 3 * control[0][0] + 3 * inverse ** 2 * t * control[1][0] + 3 * inverse * t ** 2 * control[2][0] + t ** 3 * control[3][0]
            y = inverse ** 3 * control[0][1] + 3 * inverse ** 2 * t * control[1][1] + 3 * inverse * t ** 2 * control[2][1] + t ** 3 * control[3][1]
            points.append((round(x * scale), round(y * scale)))
    return points


def draw_icon(canvas: Image.Image, box, background: str | None = None) -> None:
    x, y, width, height = box
    scale = min(width / 104, height / 64)
    rendered_width, rendered_height = 104 * scale, 64 * scale
    offset_x, offset_y = x + (width - rendered_width) / 2, y + (height - rendered_height) / 2

    layer = Image.new("RGBA", (round(rendered_width), round(rendered_height)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if background:
        draw.rounded_rectangle((0, 0, layer.width - 1, layer.height - 1), radius=round(12 * scale), fill=background)

    for rect in ((30, 4, 41, 12), (8, 20, 51, 28), (26, 36, 37, 44), (12, 52, 42, 60)):
        rounded_rect(draw, scale, rect, 4, NAVY)
    for rect in ((47, 4, 76, 12), (56, 20, 92, 28), (42, 36, 92, 44), (48, 52, 76, 60)):
        rounded_rect(draw, scale, rect, 4, INDIGO)
    draw.line(bezier_points(scale), fill=INDIGO, width=max(1, round(8 * scale)), joint="curve")

    canvas.alpha_composite(layer, (round(offset_x), round(offset_y)))


def icon_image(size: int, opaque: bool = False) -> Image.Image:
    supersampling = 4
    base_color = WHITE if opaque else (255, 255, 255, 0)
    image = Image.new("RGBA", (size * supersampling, size * supersampling), base_color)
    padding = max(1, round(size * 0.07)) * supersampling
    draw_icon(image, (padding, padding, image.width - 2 * padding, image.height - 2 * padding))
    return image.resize((size, size), Image.Resampling.LANCZOS)


def generate_email_lockup() -> None:
    scale = 4
    source_width, output_width, output_height = 252, 240, 56
    image = Image.new("RGBA", (source_width * scale, output_height * scale), (0, 0, 0, 0))
    draw_icon(image, (0, 4 * scale, 70 * scale, 44 * scale))
    draw = ImageDraw.Draw(image)
    draw.text((78 * scale, 7 * scale), "DemandLint", font=font(29 * scale, bold=True), fill=NAVY)

    # Fit the complete lockup into the original 240x56 asset while preserving its proportions.
    # The wider source canvas prevents the final "t" from touching or crossing the right edge.
    fitted_height = round(image.height * output_width / source_width)
    fitted = image.resize((output_width * scale, fitted_height), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (output_width * scale, output_height * scale), (0, 0, 0, 0))
    output.alpha_composite(fitted, (0, (output.height - fitted.height) // 2))
    output.resize((output_width, output_height), Image.Resampling.LANCZOS).save(
        BRAND / "demandlint-logo-email.png", optimize=True
    )


def generate_social_preview() -> None:
    scale = 2
    image = Image.new("RGBA", (1200 * scale, 630 * scale), NAVY)
    draw = ImageDraw.Draw(image)

    for y in range(70, 631, 70):
        draw.line((0, y * scale, image.width, y * scale), fill="#202C45", width=scale)
    for x in range(70, 1201, 70):
        draw.line((x * scale, 0, x * scale, image.height), fill="#202C45", width=scale)

    draw.rounded_rectangle((72 * scale, 52 * scale, 170 * scale, 116 * scale), radius=16 * scale, fill=WHITE)
    draw_icon(image, (80 * scale, 58 * scale, 82 * scale, 52 * scale))
    draw.text((190 * scale, 56 * scale), "DemandLint", font=font(38 * scale, bold=True), fill=WHITE)
    draw.text((74 * scale, 190 * scale), "Clean data in.", font=font(76 * scale, bold=True), fill=WHITE)
    draw.text((74 * scale, 276 * scale), "Reliable data out.", font=font(76 * scale, bold=True), fill=WHITE)
    draw.text((78 * scale, 394 * scale), "Prepare, validate and transform data before import.", font=font(29 * scale), fill=MUTED)

    flow_y = 526 * scale
    for start, length, color in ((76, 180, NAVY), (284, 162, NAVY), (474, 238, INDIGO), (740, 152, INDIGO), (920, 202, INDIGO)):
        draw.rounded_rectangle((start * scale, flow_y, (start + length) * scale, (526 + 18) * scale), radius=9 * scale, fill=color if color == INDIGO else "#33405A")

    image.resize((1200, 630), Image.Resampling.LANCZOS).convert("RGB").save(PUBLIC / "og.png", optimize=True, quality=92)


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    favicon_16 = icon_image(16, opaque=True)
    favicon_32 = icon_image(32, opaque=True)
    favicon_16.save(PUBLIC / "favicon-16x16.png", optimize=True)
    favicon_32.save(PUBLIC / "favicon-32x32.png", optimize=True)
    favicon_32.save(PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)], append_images=[favicon_16])
    icon_image(180, opaque=True).save(PUBLIC / "apple-touch-icon.png", optimize=True)
    generate_email_lockup()
    generate_social_preview()


if __name__ == "__main__":
    main()
