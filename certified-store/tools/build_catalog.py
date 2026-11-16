"""
Build the store catalog (every SKU, price, unit, heading and note) from the CRM
product export (Excel) and link it to:
  * the CRM product _id (so store orders become CRM quotes with real product refs)
  * the website page(s) where the SKU appears, and the image shown for it there.

Input : raw/products-export-2026-11-14.xlsx, raw/crm_products.json,
        ../server/seed/pages_blocks.json
Output: ../server/seed/catalog.json, ../server/seed/pages.json, report.txt
"""
import json, re, sys, collections
from pathlib import Path
import openpyxl

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from extract_pages import all_text, all_images  # noqa

SEED = HERE.parent / "server/seed"
pages = json.loads((SEED / "pages_blocks.json").read_text())
crm = json.loads((HERE / "raw/crm_products.json").read_text())
ORDER = {"general": 0, "custom": 1, "thirdparty": 2}
crm.sort(key=lambda x: (ORDER[x["productType"]], x["sortIndex"]))
N = lambda s: re.sub(r"\s+", " ", str(s if s is not None else "")).strip()
report = []

# ---------------------------------------------------------------- Excel rows
wb = openpyxl.load_workbook(HERE / "raw/products-export-2026-11-14.xlsx")
TYPES = [("General", "general"), ("Custom", "custom"), ("Third Party", "thirdparty")]
xl_rows = []
for sheet, typ in TYPES:
    for r in list(wb[sheet].iter_rows(values_only=True))[1:]:
        pid, desc, price, unit = (list(r) + [None] * 4)[:4]
        if pid is None and desc is None and price is None:
            continue
        xl_rows.append({"type": typ, "pid": pid, "desc": desc, "price": price, "unit": unit})

crm_prod = [c for c in crm if not c["isHeading"] and not c["isNote"]]
crm_head = [c for c in crm if c["isHeading"] or c["isNote"]]
xl_prod = [r for r in xl_rows if r["desc"] is not None or r["price"] is not None]
xl_head = [r for r in xl_rows if not (r["desc"] is not None or r["price"] is not None)]
assert len(xl_prod) == len(crm_prod), (len(xl_prod), len(crm_prod))
assert len(xl_head) == len(crm_head), (len(xl_head), len(crm_head))

# ---------------------------------------------------------------- page text index
TXT = {s: " ".join(all_text(b)) for s, b in pages.items()}


def code_pages(pn):
    if not pn:
        return []
    rx = re.compile(r"(?<![A-Za-z0-9-])" + re.escape(pn) + r"(?![A-Za-z0-9])")
    return [s for s, t in TXT.items() if rx.search(t)]


# code -> image from a card (grid column with image + heading == code / starts with code)
def card_images():
    idx = collections.defaultdict(list)  # code -> [(slug, src, caption)]

    def walk(slug, bs):
        for b in bs:
            if b["t"] == "grid":
                for col in b["cols"]:
                    imgs = [x for x in col if x["t"] == "image"]
                    heads = [x for x in col if x["t"] == "heading"]
                    if imgs and heads:
                        for h in heads:
                            for code in re.findall(r"[A-Z0-9]{1,6}(?:-[A-Z0-9]{1,6})+", h["text"]):
                                cap = " ".join(x["text"] for x in heads if x is not h)
                                idx[code].append((slug, imgs[0]["src"], cap))
                    walk(slug, col)
            elif b["t"] in ("link", "hero"):
                walk(slug, b["blocks"])
            elif b["t"] == "tabs":
                for tb in b["tabs"]:
                    walk(slug, tb["blocks"])
    for s, bs in pages.items():
        walk(s, bs)
    return idx


CARD = card_images()


def caption_pairs(slug):
    """(caption, image) pairs on a page: heading next to an image."""
    pairs = []

    def walk(bs):
        for i, b in enumerate(bs):
            if b["t"] == "grid":
                for col in b["cols"]:
                    walk(col)
            elif b["t"] in ("link", "hero"):
                walk(b["blocks"])
            elif b["t"] == "tabs":
                for tb in b["tabs"]:
                    walk(tb["blocks"])
            elif b["t"] == "image":
                for j in (i - 1, i + 1):
                    if 0 <= j < len(bs) and bs[j]["t"] == "heading":
                        pairs.append((bs[j]["text"], b["src"]))
    walk(pages[slug])
    return pairs


STOP = {"custom", "w", "with", "the", "and", "a", "of", "-", "certified", "baseline", "stabilizer"}


def toks(s):
    return {t for t in re.findall(r"[a-z0-9]+", s.lower()) if t not in STOP}


def caption_match(name, slug):
    a = toks(name)
    if not a:
        return None
    scored = []
    for cap, src in caption_pairs(slug):
        b = toks(cap)
        if not b:
            continue
        j = len(a & b) / len(a | b)
        scored.append((j, cap, src))
    scored.sort(reverse=True)
    if scored and scored[0][0] >= 0.7 and (len(scored) == 1 or scored[0][0] - scored[1][0] >= 0.15):
        return scored[0]
    return None
IGNORE_IMG = {"https://certifiedortho.com/wp-content/uploads/2025/04/Code.jpeg"}


def main_image(slug):
    for src in all_images(pages[slug]):
        if src not in IGNORE_IMG and not src.endswith(("logo2.png",)):
            return src
    return None


# ---------------------------------------------------------------- group -> page
# Groups (CRM sub-category) whose SKUs are not printed on the website but whose
# website page is unambiguous by name. Only exact product-family pages are used.
GROUP_PAGE = {
    "Double Action Y-Insert Strrup": "double-action-stirrup",
    "Baseline Double Action Ankle Joint Replacement Parts": "baseline-double-action",
    "Baseline Dorsi-Assist Ankle Joint Replacement Parts": "baseline-dorsi-assist",
    "Baseline Standard Action Ankle Joint Replacement Parts": "baseline-standard-action",
    "Vertex Thermoplastic Double Action Ankle Joint Replacement Parts": "vertex-double-action-ankle-joint",
    "Vertex Dynamic Ratchet Lock Action Ankle Joint": "dyna-lock-ankle-joint",
    "Vertex Dynamic Ratchet Lock Ankle Joint Replacement Parts": "dyna-lock-ankle-joint",
    "Vertex Range of Motion Ankle Joint Replacement Parts": "vertex-ankle-joint",
    "Baseline Free Motion Ankle Joint Replacement Parts": "baseline-free-motion",
    "V-3 Ankle Joint Replacement Parts": "v3-ankle-joint",
    "Baseline Bumper Stop": "baseline-bumper-stops",
    "Soft Varus/Valgus Pull Strap for Thermoplastics": "varus-valgus-pull-strap-for-thermoplastics",
    "Soft Varus/Valgus Pull Strap for Thermoplastics with Rivet Tab Attachment": "varus-valgus-pull-strap-for-thermoplastics",
    "Zero-G AFO Custom Models": "zero-g",
    "Zero-G AFO Seamless Interface Sock": "zero-g",
    "Hi-Five Pediatric SEWHO": "hi-five-sewho",
    "Hi-Five Arm Section Only w/All Components": "hi-five-sewho",
    "Carbon Footplate Morton's Toe": "carbon-plate",
    "Baseline Heel Wedges 60 & 30 Durometer": "baseline-heel-wedges",
    "KIDFAB Custom Pediatric GO AFO's": "kidfab-pediatric-go-afos",
    "Stabilizer Custom Performance AFO Product Line": "stabilizer-performance-afos",
    "Stabilizer Custom Leather AFO Additional Option & Repairs": "stabilizer-leather-afos",
    "Stabilizer Custom Performance AFO Additional Options": "stabilizer-performance-afos",
    "Stabilizer Custom Unweghting AFO Product Line": "skywalker-unweighting-afos",
    "Stabilizer Custom Unweghting AFO Additional Options": "skywalker-unweighting-afos",
    "Stabilizer Neuro AFO (CROW)": "certified-crow-walkers",
    "Certified Thermoplastic AFO Product Line": "certified-thermoplastic-afos",
    # standard-smo page shows exactly: SMO Standard Molded / w/Flexible Plastic Inner Boot / w/Flexible Foam Inner Boot
    "Stabilizer SMO Product Line": "standard-smo",
    "Certified Thermoplastic KAFO Product Line": "thermoplastic-fab",
    "Certified Conventional AFO Product Line": "conventional-fab",
    "Certified Conventional KAFO Product Line": "conventional-fab",
}
MAJOR_PAGE = {
    "SHOE MODIFICATIONS and STIRRUP ATTACHMENTS": "shoe-modifications",
    "CAD MODIFICATIONS, CAD CARVING SERVICES, & SCANNING ACCESSORIES": "cad-carving-services",
}

# ---------------------------------------------------------------- assemble rows
rows = []
hi = pi = 0
major = sub = section = ""
diffs = []
prev_type = None
for r in xl_rows:
    typ = r["type"]
    if typ != prev_type:  # each Excel sheet starts fresh
        major = sub = section = ""
        prev_type = typ
    is_prod = r["desc"] is not None or r["price"] is not None
    if not is_prod:
        c = crm_head[hi]; hi += 1
        text = N(r["pid"])
        if c["isNote"]:
            rows.append({"kind": "note", "type": typ, "text": text, "section": section, "major": major, "sub": sub})
            continue
        assert N(c["headingText"]) == text, (c["headingText"], text)
        level = "major" if c["headingLevel"] == "major" else "sub"
        if (text == text.upper() and re.search(r"[A-Z]", text)) or text in MAJOR_PAGE:
            section = text
        if level == "major":
            major, sub = text, ""
        else:
            sub = text
        rows.append({"kind": level, "type": typ, "text": text})
        continue
    c = crm_prod[pi]; pi += 1
    pn = N(r["pid"])
    if c["isSubProduct"] and not pn:
        # continuation line of the previous product's description (kit contents)
        if rows and rows[-1]["kind"] in ("product", "line"):
            rows.append({"kind": "line", "type": typ, "text": N(r["desc"]), "crmId": c["_id"]})
        else:  # printed right under a group heading → a note for that group
            rows.append({"kind": "note", "type": typ, "text": N(r["desc"]), "section": section, "major": major, "sub": sub})
        continue
    price = r["price"]
    label = ""
    if isinstance(price, str):
        label, price = price.strip(), None
    # Store follows the live CRM record (what invoices/quotes will use)
    crm_price = c["unitPrice"]
    crm_label = c["priceLabel"] or ""
    if N(r["desc"]) != N(c["name"]):
        diffs.append(f"{pn}: Excel description '{N(r['desc'])}' vs CRM '{N(c['name'])}' (store uses CRM)")
    if (price != crm_price) or (label != crm_label):
        diffs.append(f"{pn}: Excel price {r['price']} vs CRM {crm_price or crm_label}")
    rows.append({
        "kind": "product", "type": typ, "section": section, "major": major, "sub": sub,
        "partNumber": pn, "name": N(c["name"]), "price": crm_price, "priceLabel": crm_label,
        "unit": N(c["unit"]), "crmId": c["_id"],
    })

# ---------------------------------------------------------------- link to pages
page_skus = collections.defaultdict(list)
CAPTION_LOG = []
# family = same section/major/sub group; if most of a family is printed on one page,
# the remaining members of that family belong to that page too.
fam_hits = collections.defaultdict(collections.Counter)
fam_size = collections.Counter()
for row in rows:
    if row["kind"] == "product":
        key = (row["type"], row["major"], row["sub"])
        fam_size[key] += 1
        for h in code_pages(row["partNumber"]):
            fam_hits[key][h] += 1
FAMILY_PAGE = {}
for key, cnt in fam_hits.items():
    if key[2] and cnt:
        pg, n = cnt.most_common(1)[0]
        if n * 2 >= fam_size[key]:
            FAMILY_PAGE[key] = pg
unlinked = []
for row in rows:
    if row["kind"] != "product":
        continue
    pn = row["partNumber"]
    hits = code_pages(pn)
    how = "code"
    if not hits and (row["type"], row["major"], row["sub"]) in FAMILY_PAGE:
        hits, how = [FAMILY_PAGE[(row["type"], row["major"], row["sub"])]], "family"
    if not hits:
        pg = GROUP_PAGE.get(row["sub"]) or MAJOR_PAGE.get(row["section"])
        if pg:
            hits, how = [pg], "group"
    fam = FAMILY_PAGE.get((row["type"], row["major"], row["sub"]))
    if fam in hits:
        hits = [fam] + [h for h in hits if h != fam]
    row["pages"] = hits
    row["page"] = hits[0] if hits else None
    row["linkedBy"] = how if hits else None
    # image: exact card on the site for this code, else main image of first page
    # Per-SKU image ONLY when the site shows that exact item (its code on the card,
    # or its own caption next to the picture). Otherwise the SKU has no own image
    # and the store shows the product-line page instead.
    img = None
    card = [c for c in CARD.get(pn, []) if c[0] in hits] or CARD.get(pn, [])
    if card:
        img = card[0][1]
        if card[0][2]:
            row["siteCaption"] = card[0][2]
    elif hits:
        m = caption_match(row["name"], hits[0])
        if m:
            img = m[2]
            row["siteCaption"] = m[1]
            CAPTION_LOG.append(f"{pn} '{row['name']}' -> '{m[1]}' ({m[0]:.2f})")
    row["image"] = img
    for h in hits:
        page_skus[h].append(pn)
    if not hits:
        unlinked.append(f"{row['type']} | {row['major']} | {row['sub']} | {pn} | {row['name']}")

# ---------------------------------------------------------------- page covers / parents
def page_links(bs, acc):
    for b in bs:
        if b["t"] == "link" and b["href"].startswith("/p/"):
            img = next((x["src"] for x in b["blocks"] if x["t"] == "image"), None)
            title = next((x["text"] for x in b["blocks"] if x["t"] == "heading"), None)
            acc.append((b["href"][3:], img, title))
        elif b["t"] == "cards":
            for c in b["cards"]:
                if c["href"].startswith("/p/"):
                    acc.append((c["href"][3:], c["src"], c["title"]))
        elif b["t"] == "grid":
            for c in b["cols"]:
                page_links(c, acc)
        elif b["t"] in ("hero",):
            page_links(b["blocks"], acc)
        elif b["t"] == "tabs":
            for tb in b["tabs"]:
                page_links(tb["blocks"], acc)
        elif b["t"] in ("image", "heading") and b.get("href", "").startswith("/p/"):
            acc.append((b["href"][3:], b.get("src"), b.get("text")))
    return acc


MENU_ORDER = ["custom-orthotics", "kidfab", "baseline-orthotic-components", "thermoplastic-ankle-joints",
              "orthotic-joints-accessories", "pre-sized-orthotics", "certified-app"]
parent, cover = {}, {}
queue = list(MENU_ORDER)
seen = set(queue) | {"home"}
while queue:
    hub = queue.pop(0)
    for child, img, title in page_links(pages.get(hub, []), []):
        if child not in pages or child == hub:
            continue
        if img and child not in cover:
            cover[child] = img
        if child not in seen:
            parent[child] = hub
            seen.add(child)
            queue.append(child)
for child, img, title in page_links(pages["home"], []):
    if child in pages and img and child not in cover:
        cover[child] = img
# Pediatric AFO's / SMO's are cards in the home page "Custom Orthotics" section
for hub in ("pediatric-afos", "pediatric-smos"):
    parent.setdefault(hub, "custom-orthotics")
    seen.add(hub)
    queue.append(hub)
while queue:
    hub = queue.pop(0)
    for child, img, title in page_links(pages.get(hub, []), []):
        if child not in pages or child == hub:
            continue
        if img and child not in cover:
            cover[child] = img
        if child not in seen:
            parent[child] = hub
            seen.add(child)
            queue.append(child)

# home sections (exact text from the live home page)
home_blocks = pages["home"]

# ---------------------------------------------------------------- pages.json
plist = json.loads((HERE / "raw/page_titles.json").read_text())
nav = json.loads((HERE / "nav.json").read_text())
out_pages = []
for slug, blocks in pages.items():
    out_pages.append({
        "slug": slug,
        "title": plist.get(slug, slug),
        "blocks": blocks,
        "image": cover.get(slug) or main_image(slug),
        "parent": parent.get(slug),
        "skus": page_skus.get(slug, []),
        "sourceUrl": "https://certifiedortho.com/" + ("" if slug == "home" else slug + "/"),
    })

(SEED / "catalog.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))
(SEED / "pages.json").write_text(json.dumps(out_pages, ensure_ascii=False, indent=1))
(SEED / "nav.json").write_text(json.dumps(nav, ensure_ascii=False, indent=1))
(SEED / "pages_blocks.json").unlink()

prods = [r for r in rows if r["kind"] == "product"]
lines = [
    f"Products (SKUs): {len(prods)}",
    f"  linked to a website page by part number printed on the page: {sum(1 for r in prods if r['linkedBy']=='code')}",
    f"  linked by product family (rest of a group printed on that page): {sum(1 for r in prods if r['linkedBy']=='family')}",
    f"  linked by product line name (group name = page): {sum(1 for r in prods if r['linkedBy']=='group')}",
    f"  not shown on the website (catalog/price list only): {len(unlinked)}",
    f"  with an image: {sum(1 for r in prods if r['image'])}",
    f"Headings: {sum(1 for r in rows if r['kind'] in ('major','sub'))}  Notes: {sum(1 for r in rows if r['kind']=='note')}  Kit lines: {sum(1 for r in rows if r['kind']=='line')}",
    f"Pages: {len(out_pages)} (with SKUs: {sum(1 for p in out_pages if p['skus'])})",
    "", "Images matched by caption:", *CAPTION_LOG,
    "", "Excel vs CRM differences:", *diffs,
    "", "SKUs not on any website page:", *unlinked,
]
(HERE / "report.txt").write_text("\n".join(lines))
print("\n".join(lines[:12]))
