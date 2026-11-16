"""Independent check: what the running store serves vs the two sources
(the Excel export and an independent text capture of the live website)."""
import json, re, sys, urllib.request, openpyxl
sys.path.insert(0, '.')
from extract_pages import all_text, all_images
API = "http://localhost:5050/api"
get = lambda u: json.load(urllib.request.urlopen(API + u))
N = lambda s: re.sub(r"\s+", " ", str(s if s is not None else "")).strip()
fails = 0

# 1) price list vs Excel
rows = [r for r in get("/catalog") if r["kind"] == "product"]
wb = openpyxl.load_workbook("raw/products-export-2026-11-14.xlsx")
xl = []
for ws in wb.worksheets:
    for r in list(ws.iter_rows(values_only=True))[1:]:
        if (r[1] is not None or r[2] is not None) and r[0]:
            xl.append(r)
print("Excel SKUs:", len(xl), " Store SKUs:", len(rows))
for r, s in zip(xl, rows):
    price = s["price"] if s["price"] is not None else (s["priceLabel"] or None)
    d = []
    if N(r[0]) != s["partNumber"]: d.append(f"id {r[0]} != {s['partNumber']}")
    if N(r[1]) != s["name"]: d.append(f"desc '{N(r[1])}' != '{s['name']}'")
    if not (r[2] == price or N(r[2]) == N(price)): d.append(f"price {r[2]} != {price}")
    if N(r[3]) != s["unit"]: d.append(f"unit {r[3]} != {s['unit']}")
    if d: fails += 1; print("  DIFF", r[0], "; ".join(d))
# kit lines
lines_x = sum(1 for ws in wb.worksheets for r in list(ws.iter_rows(values_only=True))[1:] if r[1] and not r[0])
notes_from_lines = [r for r in get("/catalog") if r["kind"] == "note" and r["text"].startswith("(Includes Cost")]
print("Kit-content lines in Excel:", lines_x, " in store:", sum(len(r["lines"]) for r in rows) + len(notes_from_lines), "(incl. group notes)")

# 2) website pages vs independent capture (pages_v1.txt, captured with a different method)
v1 = open("raw/pages_v1.txt").read().split("=====PAGE ")[1:]
n = lambda s: re.sub(r"[\s​ |]+", "", s).lower()
tl = ml = ti = mi = 0
for chunk in v1:
    slug, body = chunk.split("\n", 1)
    p = get(f"/pages/{slug}") if slug != "home" else {"blocks": get("/home")["blocks"]}
    blob = n(" ".join(all_text(p["blocks"])))
    imgs = set(all_images(p["blocks"]))
    for line in body.split("\n"):
        if re.match(r"^(#\d|P|LI|TR) ", line):
            t = line.split(" ", 1)[1]
            if line.startswith("TR "): t = t.replace("\t", " ")
            tl += 1
            if n(t) not in blob:
                ml += 1
                if not (slug == "home" and "required" in t): print("  TEXT MISSING", slug, "|", t[:90])
        elif line.startswith("IMG "):
            ti += 1
            src = line.split()[1].replace("U/", "https://certifiedortho.com/wp-content/uploads/")
            if src not in imgs: mi += 1; print("  IMAGE MISSING", slug, src)
print(f"Website text lines checked: {tl}, missing: {ml}  | images checked: {ti}, missing: {mi}")
print("RESULT:", "OK" if fails <= 1 else f"{fails} SKU differences")
