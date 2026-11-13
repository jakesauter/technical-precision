"""Marina poster for Technical Precision: a letter-size PDF with a custom QR code (boat and waves in the middle)
that opens https://tepco.us.com.

The QR uses the highest error correction (H, ~30%), so the boat badge in the center can cover modules and the code
still scans; the three finder squares and a white quiet zone are kept intact. Checked after rendering with two
independent decoders (OpenCV and zbar) at several sizes.

Usage: ~/venvs/qr/bin/python make_poster.py   (writes poster.html, then render_poster.cjs makes poster.pdf / .png)
"""
import pathlib

import segno

HERE = pathlib.Path(__file__).parent
URL = "https://tepco.us.com"
NAVY, INK, CYAN, WAVE = "#0f3b7c", "#0b2a5b", "#2f8fd6", "#5fb3e8"

qr = segno.make(URL, error="h", boost_error=False)
matrix = [list(row) for row in qr.matrix]
n = len(matrix)
quiet = 4
size = n + 2 * quiet
mid = n / 2
badge_r = n * 0.17          # cleared circle for the boat badge (well inside H's 30% budget)


def in_finder(r, c):
    return (r < 7 and c < 7) or (r < 7 and c >= n - 7) or (r >= n - 7 and c < 7)


parts = []
for r in range(n):
    for c in range(n):
        if not matrix[r][c] or in_finder(r, c):
            continue
        if ((r + .5 - mid) ** 2 + (c + .5 - mid) ** 2) ** .5 < badge_r + .6:
            continue
        parts.append(f'<rect x="{c + quiet + .05:.2f}" y="{r + quiet + .05:.2f}" width=".9" height=".9" rx=".45"/>')

finders = []
for (r0, c0) in [(0, 0), (0, n - 7), (n - 7, 0)]:
    x, y = c0 + quiet, r0 + quiet
    finders.append(f'<path d="M{x} {y}h7v7h-7z M{x + 1} {y + 1}v5h5v-5z" fill="{INK}" fill-rule="evenodd"/>'
                   f'<rect x="{x + 2}" y="{y + 2}" width="3" height="3" fill="{INK}"/>')

cx = cy = quiet + mid
R = badge_r
# Boat badge: navy disc with a line-drawn motor yacht facing left, bow raised about 25 degrees as it rides up a wave.
LW = .62   # line weight, in the badge's 20-unit drawing space
badge = f"""
<defs><clipPath id="badge-clip"><circle cx="{cx}" cy="{cy}" r="{R - .35}"/></clipPath></defs>
<circle cx="{cx}" cy="{cy}" r="{R}" fill="{NAVY}"/>
<g clip-path="url(#badge-clip)" fill="none" stroke-linecap="round" stroke-linejoin="round"><g transform="translate({cx} {cy}) scale({R / 10})">
  <g stroke="{WAVE}" stroke-width="{LW}">
    <path d="M11 5.0 C7.4 4.9 4 4.1 0.4 2.2 C-2.6 0.6 -4.8 -0.6 -6.8 0.2 C-8.4 0.9 -8.8 2.6 -7.6 3.2"/>
    <path d="M11 7.4 C6.4 7.3 1.6 6 -2.4 4.4 C-5.4 3.2 -8 3.2 -11 5.2" opacity=".8"/>
    <path d="M11 9.7 C5.4 9.6 -0.6 8.6 -5.4 7.6 C-7.6 7.2 -9.6 7.4 -11 8" opacity=".55"/>
  </g>
  <g transform="translate(0.4 0.3) rotate(25) scale(.7)" stroke="#ffffff" stroke-width="{LW / .7:.2f}">
    <path d="M-9.4 -0.4 L8.2 0 L8.0 2.5 L-3.8 2.5 Q-7.6 2.1 -9.4 -0.4 Z" fill="{NAVY}"/>
    <path d="M-7.2 1.25 L8.1 1.35" stroke="{WAVE}"/>
    <path d="M-4.4 -0.3 L-2.6 -2.7 L5.4 -2.7 L6.4 -0.05" fill="{NAVY}"/>
    <path d="M-2.1 -1.75 L-0.2 -1.75 M0.8 -1.75 L2.6 -1.75 M3.6 -1.75 L5.0 -1.75" stroke="{WAVE}"/>
    <path d="M-1.4 -2.7 L-0.4 -4.3 L4.2 -4.3 L4.6 -2.7" fill="{NAVY}"/>
    <path d="M-1.2 -4.3 L5.6 -4.3"/>
    <path d="M2.0 -4.3 L2.6 -6.0 M1.7 -6.0 L3.5 -6.0"/>
  </g>
  <g stroke="#ffffff" stroke-width="{LW * .85}">
    <path d="M-6.6 -2.6 q-1.6 -.6 -3 .2 M-6.2 -3.8 q-1.2 -1.2 -2.6 -1.2 M-5.2 -4.6 q-.4 -1.2 -1.2 -1.9"/>
    <path d="M5.4 3.6 Q7 4.4 9.4 4.2 M6.2 2.6 Q7.6 3 9 2.8" stroke="{WAVE}"/>
  </g>
</g></g>
<circle cx="{cx}" cy="{cy}" r="{R - .35}" fill="none" stroke="#ffffff" stroke-width=".18"/>"""

qr_svg = f"""<svg class="qr" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code for tepco.us.com">
<rect width="{size}" height="{size}" rx="2" fill="#ffffff"/>
<g fill="{INK}">{''.join(parts)}</g>
{''.join(finders)}
{badge}
</svg>"""

# A band of waves along the bottom of the poster (outside the QR's quiet zone)
waves = """<svg class="waves" viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
<path d="M0 30 C150 0 300 70 450 30 S750 0 900 30 S1150 70 1200 30 V220 H0Z" fill="#2f8fd6" opacity=".35"/>
<path d="M0 55 C150 20 300 95 450 55 S750 20 900 55 S1150 95 1200 55 V220 H0Z" fill="#1f6fb8" opacity=".6"/>
<path d="M0 82 C150 50 300 115 450 82 S750 50 900 82 S1150 115 1200 82 V220 H0Z" fill="#0f3b7c"/>
</svg>"""

fonts = pathlib.Path(__file__).resolve().parent.parent / "fonts"
html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Technical Precision marina poster</title>
<style>
@font-face {{ font-family: "Barlow Condensed"; font-weight: 700; src: url({(fonts / 'barlow-condensed-700-latin.woff2').as_uri()}); }}
@font-face {{ font-family: "Barlow Condensed"; font-weight: 600; src: url({(fonts / 'barlow-condensed-600-latin.woff2').as_uri()}); }}
@font-face {{ font-family: "Barlow"; font-weight: 400 600; src: url({(fonts / 'barlow-400-latin.woff2').as_uri()}); }}
@font-face {{ font-family: "Barlow"; font-weight: 600; src: url({(fonts / 'barlow-600-latin.woff2').as_uri()}); }}
@page {{ size: 8.5in 11in; margin: 0; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; width: 8.5in; height: 11in; }}
body {{ font-family: "Barlow", sans-serif; color: {INK}; background: #f4f8fd; position: relative; overflow: hidden;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.top {{ background: {NAVY}; color: #fff; padding: .42in .55in .36in; position: relative; }}
.top::after {{ content: ""; position: absolute; inset: 0; opacity: .12;
  background-image: linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px); background-size: .25in .25in; }}
.brand {{ display: flex; align-items: center; gap: .22in; position: relative; z-index: 1; }}
.brand svg {{ width: .82in; height: .82in; flex: none; }}
h1 {{ font: 700 .7in/0.95 "Barlow Condensed", sans-serif; white-space: nowrap; letter-spacing: .01em; text-transform: uppercase; margin: 0; }}
.sub {{ font: 600 .2in "Barlow Condensed", sans-serif; letter-spacing: .12em; white-space: nowrap; text-transform: uppercase; color: #9fd0ff; margin-top: .06in; }}
.pitch {{ text-align: center; padding: .28in .6in 0; }}
.pitch .q {{ font: 700 .44in/1.02 "Barlow Condensed", sans-serif; text-transform: uppercase; color: {NAVY}; margin: 0; }}
.pitch .a {{ font-size: .21in; line-height: 1.35; margin: .1in auto 0; max-width: 6.9in; }}
.pitch .a b {{ color: {NAVY}; }}
.qrwrap {{ display: flex; flex-direction: column; align-items: center; margin-top: .18in; }}
.qr {{ width: 4.15in; height: 4.15in; }}
.scan {{ font: 700 .27in "Barlow Condensed", sans-serif; letter-spacing: .08em; text-transform: uppercase; color: {NAVY}; margin-top: .12in; }}
.url {{ font-size: .19in; color: #34507e; margin-top: .02in; }}
.call {{ position: absolute; left: 0; right: 0; bottom: .26in; text-align: center; z-index: 2; color: #fff; }}
.call .k {{ font: 600 .22in "Barlow Condensed", sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #9fd0ff; }}
.call .phone {{ font: 700 .66in/1 "Barlow Condensed", sans-serif; letter-spacing: .02em; }}
.call .more {{ font-size: .16in; opacity: .9; margin-top: .02in; }}
.waves {{ position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 2.35in; }}
</style></head><body>
<header class="top">
  <div class="brand">
    <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1.5" y="1.5" width="37" height="37" fill="none" stroke="#fff" stroke-width="1.5"/>
      <path d="M8 12h14M15 12v17M22 29V12h6.5a4.5 4.5 0 0 1 0 9H22" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="square"/>
      <path d="M32 33h-5M32 33v-5" stroke="#5fb3e8" stroke-width="1.2"/></svg>
    <div><h1>Technical Precision</h1><div class="sub">Marine machining &amp; fabrication · Poughkeepsie NY</div></div>
  </div>
</header>
<section class="pitch">
  <p class="q">Need work done on your boat?<br>A custom part fabricated?</p>
  <p class="a">Technical Precision is the right place for you. CNC machining, welding, bending and powder coating under one roof.
    <b>Any job, any size.</b></p>
</section>
<div class="qrwrap">{qr_svg}
  <div class="scan">Scan to see our work &amp; get a quote</div>
  <div class="url">tepco.us.com</div>
</div>
{waves}
<div class="call"><div class="k">Just give us a call</div><div class="phone">(845) 473-0548</div>
  <div class="more">22 Commerce St, Poughkeepsie, NY · dave@technicalprecisioncorp.com</div></div>
</body></html>"""
(HERE / "poster.html").write_text(html, encoding="utf-8")
print(f"QR version {qr.version} ({n}x{n} modules), error correction {qr.error}, {len(parts)} data dots, badge radius {R:.1f} modules")
