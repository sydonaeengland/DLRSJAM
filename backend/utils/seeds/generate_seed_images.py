# Generates placeholder licence photos and ID document images used by the seed applications.
"""
Generates placeholder seed images modelled on the app's existing LicenceCard
React component and Jamaican NID/police report styles.

Licence front/back exactly mirrors LicenceCard.jsx:
  - Green gradient background (#e8f5e0 → #b8dcc8)
  - #003087 blue labels, 1px bordered field boxes
  - Coat of arms + "GOVERNMENT OF JAMAICA / DRIVER'S LICENCE" header
  - Photo box top-right
  - Back: barcode strip + judicial endorsements table

"""

import os
from PIL import Image, ImageDraw, ImageFont

# Paths
_HERE = os.path.dirname(os.path.abspath(__file__))
_COAT = os.path.join(_HERE, "..", "..", "..", "frontend", "src", "assets", "coat-of-arms.png")

# Palette 
LICENCE_BLUE      = (0, 48, 135)        # #003087
LICENCE_BORDER    = (21, 101, 192)      # #1565c0
LICENCE_BG_TOP    = (232, 245, 224)     # #e8f5e0
LICENCE_BG_BOT    = (184, 220, 200)     # #b8dcc8
FIELD_BG          = (255, 255, 255, 100)
NID_GREEN_DARK    = (0,  80,  45)
NID_GREEN_MED     = (0, 119,  73)
NID_GREEN_LIGHT   = (200, 240, 215)
NID_GOLD          = (255, 184,  28)
POLICE_DARK       = (20,  40,  80)
POLICE_BLUE_LIGHT = (220, 230, 255)
WHITE             = (252, 252, 252)
BLACK             = (10,  10,  10)
GREY_TEXT         = (80,  80,  90)
GREY_BG           = (240, 242, 245)
RED               = (200, 30,  30)


def _font(size):
    for face in ["arialbd.ttf", "arial.ttf", "Arial Bold.ttf", "Arial.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(face, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _font_reg(size):
    for face in ["arial.ttf", "Arial.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(face, size)
        except Exception:
            pass
    return ImageFont.load_default()


def _gradient_bg(img, top_color, bot_color):
    """Fill image with a vertical gradient."""
    draw = ImageDraw.Draw(img)
    W, H = img.size
    for y in range(H):
        t = y / H
        r = int(top_color[0] + (bot_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bot_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bot_color[2] - top_color[2]) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))


def _holo_overlay(img, opacity=0.18):
    """Holographic diagonal stripe overlay (matches LicenceCard holographic style)."""
    W, H = img.size
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    spacing = 8
    for i in range(-H, W + H, spacing):
        color1 = (79, 195, 247, int(255 * opacity))
        color2 = (129, 199, 132, int(255 * opacity))
        d.line([(i, 0), (i + H, H)], fill=color1, width=1)
        d.line([(i + spacing // 2, 0), (i + spacing // 2 + H, H)], fill=color2, width=1)
    base = img.convert("RGBA")
    base.alpha_composite(overlay)
    return base.convert("RGB")


def _field_box(draw, x, y, w, h, label, value, label_color, border_color,
               value_size=9, label_size=7, value_color=BLACK, bold_value=True):
    """Draw a labelled field box matching LicenceCard Field component."""
    # solid white fill so OCR isn't confused by the gradient/holo underneath
    draw.rectangle([x, y, x + w, y + h],
                   fill=(255, 255, 255), outline=border_color, width=1)
    draw.text((x + 3, y + 2), label, font=_font(label_size), fill=label_color)
    vfont = _font(value_size) if bold_value else _font_reg(value_size)
    draw.text((x + 3, y + 2 + label_size + 2), value, font=vfont, fill=value_color)


def _coat_of_arms(size):
    """Load coat of arms PNG, return resized RGBA image or None."""
    try:
        img = Image.open(_COAT).convert("RGBA")
        img = img.resize((size, size), Image.LANCZOS)
        return img
    except Exception:
        return None


def _barcode(draw, x, y, w, h):
    """Draw a barcode strip matching LicenceCard back."""
    pos = x
    bar_w_options = [3, 1.5, 3, 1.5, 1.5, 3]
    i = 0
    while pos < x + w:
        bw = bar_w_options[i % len(bar_w_options)]
        opacity = 0.4 if i % 5 == 0 else 1.0
        col = int(17 * opacity)
        draw.rectangle([int(pos), y, int(pos + bw), y + h], fill=(col, col, col))
        pos += bw + 0.5
        i += 1


# ═══════════════════════════════════════════════════════════════════════════════
# LICENCE FRONT  
# ═══════════════════════════════════════════════════════════════════════════════

def make_licence_front(path, firstname, lastname, trn, dob, issue_date,
                       expiry_date, licence_class, address, collectorate, sex="M"):
    # Card ratio 1.586:1 — use 620×390
    W, H = 620, 390
    img = Image.new("RGB", (W, H), LICENCE_BG_TOP)
    _gradient_bg(img, LICENCE_BG_TOP, LICENCE_BG_BOT)
    img = _holo_overlay(img)
    draw = ImageDraw.Draw(img)

    PAD = 10

    # Header
    header_h = 44
    draw.line([(PAD, header_h), (W - PAD, header_h)], fill=LICENCE_BORDER, width=2)

    coat = _coat_of_arms(28)
    coat_x = W // 2 - 60
    if coat:
        img.paste(coat, (coat_x, PAD - 2), coat)
        text_x = coat_x + 34
    else:
        text_x = W // 2 - 20

    draw.text((text_x, PAD + 1),  "GOVERNMENT OF JAMAICA",
              font=_font(9), fill=LICENCE_BLUE)
    draw.text((text_x, PAD + 13), "DRIVER'S LICENCE",
              font=_font(8), fill=LICENCE_BLUE)

    # Body layout
    body_y   = header_h + 6
    photo_w  = 72
    photo_h  = 90
    photo_x  = W - PAD - photo_w
    fields_w = W - PAD * 2 - photo_w - 8
    fy       = body_y
    fw2      = (fields_w - 3) // 2
    row_h    = 24

    # Row 1: CLASS | TRN
    _field_box(draw, PAD, fy, fw2, row_h, "CLASS", licence_class,
               LICENCE_BLUE, LICENCE_BORDER)
    _field_box(draw, PAD + fw2 + 3, fy, fw2, row_h, "TRN", trn,
               LICENCE_BLUE, LICENCE_BORDER)
    fy += row_h + 3

    # Row 2: DATE ISSUED | COLLECTORATE
    _field_box(draw, PAD, fy, fw2, row_h, "DATE ISSUED", str(issue_date),
               LICENCE_BLUE, LICENCE_BORDER)
    _field_box(draw, PAD + fw2 + 3, fy, fw2, row_h, "COLLECTORATE",
               collectorate[:12], LICENCE_BLUE, LICENCE_BORDER, value_size=7)
    fy += row_h + 3

    # Row 3: EXPIRY | BIRTH DATE | SEX
    fw3a = fields_w * 2 // 5
    fw3b = fields_w * 2 // 5
    fw3c = fields_w - fw3a - fw3b - 6
    _field_box(draw, PAD, fy, fw3a, row_h, "EXPIRY DATE", str(expiry_date),
               LICENCE_BLUE, LICENCE_BORDER,
               value_color=(RED[0], RED[1], RED[2]) if False else BLACK)
    _field_box(draw, PAD + fw3a + 3, fy, fw3b, row_h, "BIRTH DATE", str(dob),
               LICENCE_BLUE, LICENCE_BORDER)
    _field_box(draw, PAD + fw3a + fw3b + 6, fy, fw3c, row_h, "SEX", sex,
               LICENCE_BLUE, LICENCE_BORDER)
    fy += row_h + 3

    # Name box
    name_h = 26
    draw.rectangle([PAD, fy, PAD + fields_w, fy + name_h],
                   fill=(255, 255, 255, 100), outline=LICENCE_BORDER, width=1)
    draw.text((PAD + 3, fy + 2), "NAME", font=_font(7), fill=LICENCE_BLUE)
    draw.text((PAD + 3, fy + 11), firstname.upper(),
              font=_font(11), fill=BLACK)
    draw.text((PAD + 3, fy + 22), lastname.upper(),
              font=_font(11), fill=BLACK)
    fy += name_h + 3 + 11  # extra room for 2-line name

    # Address box
    addr_h = H - fy - PAD
    draw.rectangle([PAD, fy, PAD + fields_w, fy + addr_h],
                   fill=(255, 255, 255, 100), outline=LICENCE_BORDER, width=1)
    draw.text((PAD + 3, fy + 2), "ADDRESS", font=_font(7), fill=LICENCE_BLUE)
    draw.text((PAD + 3, fy + 11), address[:55], font=_font_reg(8), fill=BLACK)

    # Photo box
    px = photo_x
    py = body_y
    draw.rectangle([px, py, px + photo_w, py + photo_h],
                   fill=(255, 255, 255, 128), outline=LICENCE_BORDER, width=2)
    # Silhouette
    cx, cy = px + photo_w // 2, py + photo_h // 2 - 5
    draw.ellipse([cx - 16, cy - 20, cx + 16, cy + 20], fill=(190, 190, 200))
    draw.ellipse([cx - 22, cy + 12, cx + 22, cy + 50], fill=(140, 150, 170))
    draw.text((px + 2, py + photo_h + 4), "SIGNATURE OF",
              font=_font(6), fill=(85, 85, 85))
    draw.text((px + 2, py + photo_h + 11), "LICENSEE",
              font=_font(6), fill=(85, 85, 85))

    draw.rectangle([0, 0, W - 1, H - 1], outline=LICENCE_BORDER, width=2)
    img.save(path, "JPEG", quality=92)


# ═══════════════════════════════════════════════════════════════════════════════
# LICENCE BACK  (mirrors LicenceCard.jsx back face exactly)
# ═══════════════════════════════════════════════════════════════════════════════

def make_licence_back(path, trn, licence_class, issue_date,
                      control_number, nationality="Jamaican"):
    W, H = 620, 390
    img = Image.new("RGB", (W, H), LICENCE_BG_TOP)
    _gradient_bg(img, LICENCE_BG_TOP, LICENCE_BG_BOT)
    img = _holo_overlay(img)
    draw = ImageDraw.Draw(img)

    PAD = 10

    # Top blue banner
    banner_h = 16
    draw.rectangle([PAD, PAD, W - PAD, PAD + banner_h],
                   fill=LICENCE_BLUE)
    draw.text((W // 2, PAD + 4),
              "MUST BE CARRIED WHEN OPERATING A MOTOR VEHICLE OR APPLYING FOR RENEWAL",
              font=_font(6), fill=WHITE, anchor="mm")

    # Licence to drive + original date
    y = PAD + banner_h + 5
    row_h = 26
    half = (W - PAD * 2 - 4) // 2
    draw.rectangle([PAD, y, PAD + half, y + row_h],
                   fill=(255, 255, 255, 100), outline=LICENCE_BORDER, width=1)
    draw.text((PAD + 3, y + 2), "LICENCE TO DRIVE", font=_font(7), fill=LICENCE_BLUE)
    draw.text((PAD + 3, y + 11), licence_class + " — MOTOR CAR",
              font=_font(9), fill=BLACK)

    draw.rectangle([PAD + half + 4, y, W - PAD, y + row_h],
                   fill=(255, 255, 255, 100), outline=LICENCE_BORDER, width=1)
    draw.text((PAD + half + 7, y + 2), "ORIGINAL DATE OF ISSUE",
              font=_font(7), fill=LICENCE_BLUE)
    draw.text((PAD + half + 7, y + 11), str(issue_date), font=_font(9), fill=BLACK)
    y += row_h + 5

    # Judicial endorsements table
    table_h = H - y - 55
    draw.rectangle([PAD, y, W - PAD, y + table_h],
                   outline=LICENCE_BORDER, width=1)
    col1_w = 90
    header_h = 14
    draw.rectangle([PAD, y, W - PAD, y + header_h],
                   fill=(21, 101, 192, 30))
    draw.text((PAD + 3, y + 3), "DATE", font=_font(7), fill=LICENCE_BLUE)
    draw.line([(PAD + col1_w, y), (PAD + col1_w, y + table_h)],
              fill=LICENCE_BORDER, width=1)
    draw.text((PAD + col1_w + 4, y + 3), "JUDICIAL ENDORSEMENTS",
              font=_font(7), fill=LICENCE_BLUE)
    y += table_h + 5

    # Bottom row: CONTROL NO. | TRN | NATIONALITY | commissioner sig
    fields_y = y
    fw = 80
    _field_box(draw, PAD, fields_y, fw, 24, "CONTROL NO.", control_number,
               LICENCE_BLUE, LICENCE_BORDER, value_size=8)
    _field_box(draw, PAD + fw + 4, fields_y, fw, 24, "TRN", trn,
               LICENCE_BLUE, LICENCE_BORDER, value_size=8)
    _field_box(draw, PAD + fw * 2 + 8, fields_y, fw + 10, 24,
               "NATIONALITY", nationality, LICENCE_BLUE, LICENCE_BORDER, value_size=8)

    draw.text((W - PAD - 120, fields_y), "COMMISSIONER INLAND REVENUE",
              font=_font(6), fill=(85, 85, 85))
    draw.text((W - PAD - 80, fields_y + 10), "Dlrsjam",
              font=_font_reg(14), fill=(51, 51, 51))

    # Barcode
    barcode_y = fields_y + 28
    _barcode(draw, PAD, barcode_y, W - PAD * 2, 22)
    draw.text((W // 2, barcode_y + 25), trn,
              font=_font(8), fill=(51, 51, 51), anchor="mm")

    draw.rectangle([0, 0, W - 1, H - 1], outline=LICENCE_BORDER, width=2)
    img.save(path, "JPEG", quality=92)


# ═══════════════════════════════════════════════════════════════════════════════
# NATIONAL ID FRONT  (same field-box style, Jamaica green palette)
# ═══════════════════════════════════════════════════════════════════════════════

def make_nid_front(path, firstname, lastname, trn, dob, address):
    W, H = 620, 390
    img = Image.new("RGB", (W, H), NID_GREEN_LIGHT)
    draw = ImageDraw.Draw(img)

    # Green gradient bg
    for y in range(H):
        t = y / H
        r = int(NID_GREEN_LIGHT[0] + (184 - NID_GREEN_LIGHT[0]) * t * 0.3)
        g = int(NID_GREEN_LIGHT[1] + (220 - NID_GREEN_LIGHT[1]) * t * 0.3)
        b = int(NID_GREEN_LIGHT[2] + (200 - NID_GREEN_LIGHT[2]) * t * 0.3)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    PAD = 10
    header_h = 44

    # Header with coat of arms
    draw.line([(PAD, header_h), (W - PAD, header_h)], fill=NID_GREEN_DARK, width=2)
    coat = _coat_of_arms(28)
    coat_x = W // 2 - 60
    if coat:
        img.paste(coat, (coat_x, PAD - 2), coat)
        text_x = coat_x + 34
    else:
        text_x = W // 2 - 20
    draw.text((text_x, PAD + 1), "GOVERNMENT OF JAMAICA",
              font=_font(9), fill=NID_GREEN_DARK)
    draw.text((text_x, PAD + 13), "NATIONAL IDENTIFICATION CARD",
              font=_font(8), fill=NID_GREEN_DARK)

    body_y  = header_h + 6
    photo_w = 72
    photo_h = 90
    photo_x = W - PAD - photo_w
    fw      = W - PAD * 2 - photo_w - 8
    fw2     = (fw - 3) // 2
    row_h   = 24
    fy      = body_y

    def nid_field(x, y, w, h, label, value, small=False):
        # solid white so OCR reads cleanly through the gradient background
        draw.rectangle([x, y, x + w, y + h],
                       fill=(255, 255, 255), outline=NID_GREEN_DARK, width=1)
        draw.text((x + 3, y + 2), label, font=_font(8), fill=NID_GREEN_DARK)
        sz = 9 if small else 12
        draw.text((x + 3, y + 13), value, font=_font(sz), fill=BLACK)

    nid_field(PAD, fy, fw2, row_h, "TRN", trn)
    nid_field(PAD + fw2 + 3, fy, fw2, row_h, "DATE OF BIRTH", str(dob))
    fy += row_h + 3

    nid_field(PAD, fy, fw2, row_h, "SEX", "M")
    nid_field(PAD + fw2 + 3, fy, fw2, row_h, "NATIONALITY", "Jamaican")
    fy += row_h + 3

    # Name
    name_h = 30
    draw.rectangle([PAD, fy, PAD + fw, fy + name_h],
                   fill=(255, 255, 255), outline=NID_GREEN_DARK, width=1)
    draw.text((PAD + 3, fy + 2), "NAME", font=_font(8), fill=NID_GREEN_DARK)
    draw.text((PAD + 3, fy + 13), f"{firstname.upper()} {lastname.upper()}",
              font=_font(13), fill=BLACK)
    fy += name_h + 3 + 3

    # Address
    addr_h = H - fy - PAD - 5
    draw.rectangle([PAD, fy, PAD + fw, fy + addr_h],
                   fill=(255, 255, 255), outline=NID_GREEN_DARK, width=1)
    draw.text((PAD + 3, fy + 2), "ADDRESS", font=_font(8), fill=NID_GREEN_DARK)
    draw.text((PAD + 3, fy + 13), address[:55], font=_font_reg(11), fill=BLACK)

    # Photo box
    draw.rectangle([photo_x, body_y, photo_x + photo_w, body_y + photo_h],
                   fill=(255, 255, 255, 128), outline=NID_GREEN_DARK, width=2)
    cx = photo_x + photo_w // 2
    cy = body_y + photo_h // 2 - 5
    draw.ellipse([cx - 16, cy - 20, cx + 16, cy + 20], fill=(190, 190, 200))
    draw.ellipse([cx - 22, cy + 12, cx + 22, cy + 50], fill=(140, 150, 170))

    # Gold accent stripe
    draw.rectangle([W - PAD - 8, PAD, W - PAD, H - PAD],
                   fill=NID_GOLD)

    draw.rectangle([0, 0, W - 1, H - 1], outline=NID_GREEN_DARK, width=2)
    img.save(path, "JPEG", quality=92)


# ═══════════════════════════════════════════════════════════════════════════════
# NATIONAL ID BACK
# ═══════════════════════════════════════════════════════════════════════════════

def make_nid_back(path, trn, firstname, lastname):
    W, H = 620, 390
    img = Image.new("RGB", (W, H), NID_GREEN_LIGHT)
    draw = ImageDraw.Draw(img)

    for y in range(H):
        t = y / H
        r = int(NID_GREEN_LIGHT[0] + (184 - NID_GREEN_LIGHT[0]) * t * 0.3)
        g_c = int(NID_GREEN_LIGHT[1] + (220 - NID_GREEN_LIGHT[1]) * t * 0.3)
        b = int(NID_GREEN_LIGHT[2] + (200 - NID_GREEN_LIGHT[2]) * t * 0.3)
        draw.line([(0, y), (W, y)], fill=(r, g_c, b))

    PAD = 10

    # Top banner
    draw.rectangle([PAD, PAD, W - PAD, PAD + 16], fill=NID_GREEN_DARK)
    draw.text((W // 2, PAD + 8),
              "NATIONAL IDENTIFICATION CARD — REVERSE",
              font=_font(7), fill=WHITE, anchor="mm")

    # Magnetic stripe
    y = PAD + 24
    draw.rectangle([0, y, W, y + 34], fill=BLACK)
    y += 42

    # Signature strip
    draw.rectangle([PAD, y, W - PAD, y + 38],
                   fill=WHITE, outline=GREY_TEXT, width=1)
    draw.text((PAD + 6, y + 4), "Authorised Signature", font=_font(8), fill=GREY_TEXT)
    # Scrawl
    pts = [(PAD + 30, y + 28), (PAD + 60, y + 18), (PAD + 100, y + 30),
           (PAD + 140, y + 16), (PAD + 175, y + 26)]
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=BLACK, width=2)
    y += 46

    # Small print
    lines = [
        "This card is the property of the Government of Jamaica.",
        "If found, please return to the nearest Tax Administration Jamaica office.",
        f"Cardholder: {firstname.upper()} {lastname.upper()}",
        f"TRN: {trn}",
    ]
    for l in lines:
        draw.text((PAD, y), l, font=_font_reg(12), fill=BLACK)
        y += 18

    # Barcode
    bc_y = H - PAD - 32
    _barcode(draw, PAD, bc_y, W - PAD * 2, 22)
    draw.text((W // 2, bc_y + 25), trn,
              font=_font(8), fill=GREY_TEXT, anchor="mm")

    # Gold stripe
    draw.rectangle([W - PAD - 8, PAD, W - PAD, H - PAD], fill=NID_GOLD)

    draw.rectangle([0, 0, W - 1, H - 1], outline=NID_GREEN_DARK, width=2)
    img.save(path, "JPEG", quality=92)


# ═══════════════════════════════════════════════════════════════════════════════
# PASSPORT PHOTO  (plain portrait placeholder)
# ═══════════════════════════════════════════════════════════════════════════════

def make_passport_photo(path, firstname, lastname, trn):
    W, H = 400, 500
    img = Image.new("RGB", (W, H), (248, 250, 252))
    draw = ImageDraw.Draw(img)

    # Very light blue-grey bg
    for y in range(H):
        t = y / H
        draw.line([(0, y), (W, y)],
                  fill=(int(230 + 18 * (1 - t)), int(235 + 15 * (1 - t)), int(245 + 7 * (1 - t))))

    # Face silhouette
    cx = W // 2
    draw.ellipse([cx - 75, 70, cx + 75, 250], fill=(210, 195, 180))
    draw.ellipse([cx - 60, 55, cx + 60, 100], fill=(80, 50, 20))   # hair
    draw.ellipse([cx - 22, 250, cx + 22, 310], fill=(210, 195, 180))  # neck
    draw.ellipse([cx - 90, 295, cx + 90, 440], fill=(90, 110, 150))  # shoulders

    # Name strip
    draw.rectangle([0, H - 80, W, H], fill=LICENCE_BLUE)
    draw.text((W // 2, H - 58), f"{firstname.upper()} {lastname.upper()}",
              font=_font(16), fill=WHITE, anchor="mm")
    draw.text((W // 2, H - 36), f"TRN: {trn}",
              font=_font_reg(12), fill=(180, 200, 240), anchor="mm")
    draw.text((W // 2, H - 18), "APPLICANT PHOTO",
              font=_font(10), fill=(140, 170, 220), anchor="mm")

    draw.rectangle([0, 0, W - 1, H - 1], outline=LICENCE_BORDER, width=3)
    img.save(path, "JPEG", quality=90)


# ═══════════════════════════════════════════════════════════════════════════════
# POLICE REPORT  (JCF letterhead)
# ═══════════════════════════════════════════════════════════════════════════════

def make_police_report(path, firstname, lastname, trn, dob):
    W, H = 620, 877  # A4-ish
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    PAD = 30

    # Header band
    draw.rectangle([0, 0, W, 80], fill=POLICE_DARK)
    coat = _coat_of_arms(44)
    if coat:
        img.paste(coat, (PAD, 18), coat)
    draw.text((W // 2, 22), "JAMAICA CONSTABULARY FORCE",
              font=_font(16), fill=WHITE, anchor="mm")
    draw.text((W // 2, 46), "STATUTORY DECLARATION — LOST / STOLEN DRIVER'S LICENCE",
              font=_font(10), fill=POLICE_BLUE_LIGHT, anchor="mm")
    draw.text((W // 2, 64), "Form DL-RPL-01",
              font=_font_reg(9), fill=(160, 180, 220), anchor="mm")

    # Red side accents
    draw.rectangle([0, 80, 6, H], fill=RED)
    draw.rectangle([W - 6, 80, W, H], fill=RED)

    y = 100

    def section_line(label, value):
        nonlocal y
        draw.text((PAD + 6, y), label + ":", font=_font(10), fill=GREY_TEXT)
        draw.line([(PAD + 160, y + 14), (W - PAD - 6, y + 14)],
                  fill=(200, 200, 210), width=1)
        draw.text((PAD + 164, y), value, font=_font(11), fill=BLACK)
        y += 28

    section_line("Full Name",         f"{firstname.upper()} {lastname.upper()}")
    section_line("TRN",               trn)
    section_line("Date of Birth",     str(dob))
    section_line("Report Number",     f"JCF-{trn[:4]}-2026-{trn[-3:]}")
    section_line("Date of Report",    "10 May 2026")
    section_line("Station",           "Central Kingston Police Station")
    section_line("Reporting Officer", "Sgt. D. Patterson  #4821")
    section_line("Incident Type",     "Lost / Stolen Driver's Licence")
    section_line("Licence Class",     "C — Motor Car")

    y += 8
    draw.text((PAD + 6, y), "Declaration:", font=_font(11), fill=GREY_TEXT)
    y += 20

    body = (
        f"I, {firstname.upper()} {lastname.upper()} (TRN: {trn}), hereby solemnly declare "
        "that my driver's licence has been lost/stolen and I am unable to locate "
        "the said document despite reasonable effort. I request that a replacement "
        "licence be issued in accordance with the Road Traffic Act of Jamaica. "
        "I understand that making a false declaration is a criminal offence."
    )
    words = body.split()
    line = ""
    max_w = W - PAD * 2 - 12
    for w in words:
        test = line + w + " "
        bbox = _font_reg(10).getbbox(test)
        if bbox[2] < max_w:
            line = test
        else:
            draw.text((PAD + 6, y), line.strip(), font=_font_reg(10), fill=(50, 50, 60))
            y += 16
            line = w + " "
    if line.strip():
        draw.text((PAD + 6, y), line.strip(), font=_font_reg(10), fill=(50, 50, 60))
        y += 16

    y += 24
    sig_w = (W - PAD * 2 - 20) // 2
    draw.line([(PAD + 6, y + 30), (PAD + 6 + sig_w, y + 30)], fill=BLACK, width=1)
    draw.line([(PAD + 6 + sig_w + 20, y + 30), (W - PAD - 6, y + 30)], fill=BLACK, width=1)
    draw.text((PAD + 6, y + 34), "Declarant Signature & Date",
              font=_font_reg(9), fill=GREY_TEXT)
    draw.text((PAD + 6 + sig_w + 20, y + 34), "Officer Signature & Stamp",
              font=_font_reg(9), fill=GREY_TEXT)

    # Footer
    draw.rectangle([0, H - 36, W, H], fill=POLICE_DARK)
    draw.text((W // 2, H - 20),
              "This is an official document of the Jamaica Constabulary Force",
              font=_font_reg(9), fill=POLICE_BLUE_LIGHT, anchor="mm")

    draw.rectangle([0, 0, W - 1, H - 1], outline=POLICE_DARK, width=2)
    img.save(path, "JPEG", quality=90)


# ═══════════════════════════════════════════════════════════════════════════════
# Main entry point
# ═══════════════════════════════════════════════════════════════════════════════

def generate_seed_images(backend_root, applicants):
    """
    Generate seed images for each applicant.

    applicants: list of dicts with keys:
        user_id, firstname, lastname, trn, dob, expiry, issue_date,
        licence_class, address, collectorate, control_number

    Returns: dict keyed by (user_id, doc_type) -> absolute file path
    """
    seed_dir = os.path.join(backend_root, "uploads", "seed")
    os.makedirs(seed_dir, exist_ok=True)

    paths = {}

    for a in applicants:
        uid      = a["user_id"]
        fn       = a.get("firstname", "Applicant")
        ln       = a.get("lastname", "")
        trn      = a.get("trn", "000000000")
        dob      = a.get("dob", "1990-01-01")
        expiry   = a.get("expiry", "2026-01-01")
        issued   = a.get("issue_date", "2021-01-01")
        lclass   = a.get("licence_class", "C")
        address  = a.get("address", "Kingston, Jamaica")
        collect  = a.get("collectorate", "021")
        ctrl_no  = a.get("control_number", f"CTR{trn[:6]}")

        user_dir = os.path.join(seed_dir, str(uid))
        os.makedirs(user_dir, exist_ok=True)

        def p(filename):
            return os.path.join(user_dir, filename)

        make_passport_photo(p("passport_photo.jpg"), fn, ln, trn)
        make_nid_front(p("nid_front.jpg"), fn, ln, trn, dob, address)
        make_nid_back(p("nid_back.jpg"), trn, fn, ln)
        make_licence_front(p("licence_front.jpg"), fn, ln, trn, dob,
                           issued, expiry, lclass, address, collect)
        make_licence_back(p("licence_back.jpg"), trn, lclass, issued, ctrl_no)
        make_police_report(p("police_report.jpg"), fn, ln, trn, dob)

        paths[(uid, "licence_photo")]          = p("passport_photo.jpg")
        paths[(uid, "national_id_front")]      = p("nid_front.jpg")
        paths[(uid, "national_id_back")]       = p("nid_back.jpg")
        paths[(uid, "existing_licence_front")] = p("licence_front.jpg")
        paths[(uid, "existing_licence_back")]  = p("licence_back.jpg")
        paths[(uid, "police_report")]          = p("police_report.jpg")

    print(f"Seed images generated: {len(applicants)} applicants x 6 images each")
    return paths
