"""
Builds WooCommerce-style products from the price list (server/seed/catalog.json)
and the website pages (server/seed/pages.json).

  * A price-list group whose SKUs differ only by size / color / side / length …
    becomes ONE variable product; its SKUs are the variations. Attributes come
    from the website table columns for those SKUs (Size, Color, Side …) or, if
    the site has no table, from the words that differ in the SKU names.
  * Any other group (different models, add-on options, repairs, services) gives
    one simple product per SKU.

Nothing is invented: names, prices, units and part numbers are the price-list
values; images and descriptions are the website's.

Output: server/seed/products.json, server/seed/categories.json, tools/products-report.txt
"""
import json, re, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "server/seed"
catalog = json.loads((SEED / "catalog.json").read_text())
pages = {p["slug"]: p for p in json.loads((SEED / "pages.json").read_text())}
APP_QR = "https://certifiedortho.com/wp-content/uploads/2025/04/Code.jpeg"
LOGO_RX = re.compile(r"logo|Code\.jpeg|app-store|appstore", re.I)

# ------------------------------------------------------------------ helpers
def walk(blocks, fn):
    for b in blocks:
        fn(b)
        for col in b.get("cols", []):
            walk(col, fn)
        if b.get("blocks"):
            walk(b["blocks"], fn)
        for t in b.get("tabs", []):
            walk(t["blocks"], fn)


def page_images(slug):
    out = []
    def f(b):
        if b["t"] == "image" and not LOGO_RX.search(b["src"]):
            out.append(b["src"])
        if b["t"] == "html":
            out.extend(u for u in re.findall(r'<img src="([^"]+)"', b["html"]) if not LOGO_RX.search(u))
    walk(pages[slug]["blocks"], f) if slug in pages else None
    seen, res = set(), []
    for u in out:
        if u not in seen:
            seen.add(u); res.append(u)
    return res


def caption_pairs(slug):
    """(heading text, image) pairs that sit next to each other on a page."""
    pairs = []
    def visit(bs):
        for i, b in enumerate(bs):
            if b["t"] == "image" and not LOGO_RX.search(b["src"]):
                for j in (i - 1, i + 1, i + 2):
                    if 0 <= j < len(bs) and bs[j]["t"] == "heading":
                        pairs.append((bs[j]["text"], b["src"]))
                        break
            for col in b.get("cols", []):
                visit(col)
            if b.get("blocks"):
                visit(b["blocks"])
            for t in b.get("tabs", []):
                visit(t["blocks"])
    if slug in pages:
        visit(pages[slug]["blocks"])
    return pairs


WORD = re.compile(r"[a-z0-9]+(?:\.[0-9]+)?")
STOP = {"the", "and", "with", "w", "for", "of", "a", "only"}
def toks(s):
    return [t for t in WORD.findall((s or "").lower()) if t not in STOP]


def best_caption_image(name, slug, min_cover=1.0):
    """image whose caption words are all contained in the product name (longest caption wins)."""
    nt = set(toks(name))
    best = None
    for cap, src in caption_pairs(slug):
        ct = set(toks(cap))
        if not ct:
            continue
        cover = len(ct & nt) / len(ct)
        if cover >= min_cover:
            score = (len(ct), cover)
            if not best or score > best[0]:
                best = (score, src)
    return best[1] if best else None


# site tables: SKU -> (header, cells)
sku_table = {}
def collect(slug):
    def f(b):
        if b["t"] != "table":
            return
        hdr = None
        for r in b["rows"]:
            c = [x.strip() for x in r["cells"]]
            if r.get("head") or (c and re.match(r"(?i)^(product|part|item)", c[0] or "")):
                hdr = c
                continue
            if hdr and c and c[0]:
                sku_table.setdefault(c[0], (hdr, c))
    walk(pages[slug]["blocks"], f)
for s in pages:
    collect(s)

ATTR_WORDS = {
    "Size": {"xs", "xxs", "x", "small", "sm", "s", "medium", "med", "m", "large", "lg", "l", "xl", "xxl", "regular", "short", "tall",
             "pediatric", "peds", "adult", "infant", "youth", "child", "baby", "toddler", "universal", "mini", "petite"},
    "Color": {"black", "brown", "white", "natural", "tan", "beige", "blue", "red", "pink", "smoked", "taupe", "gray", "grey", "clear", "nt", "bk", "br", "wh"},
    "Side": {"left", "right", "medial", "lateral", "bilateral", "pair", "lt", "rt"},
}
NUMERIC = re.compile(r"^\d+(\.\d+)?(mm|cm|in|oz)?$")


def common_prefix(lists):
    out = []
    for parts in zip(*lists):
        if all(p == parts[0] for p in parts):
            out.append(parts[0])
        else:
            break
    return out


def variant_words(names):
    words = [re.findall(r"[^\s,\-–()/]+", n) for n in names]
    low = [[w.lower() for w in ws] for ws in words]
    pre = len(common_prefix(low))
    suf = len(common_prefix([list(reversed(w[pre:])) for w in low]))
    return [ws[pre:len(ws) - suf] for ws in words], pre


def is_attr_word(w):
    w = w.lower().strip(".\"'")
    return NUMERIC.match(w) or any(w in v for v in ATTR_WORDS.values()) or w in {"mm", "cm", "in", "durometer", "thick", "x", "pk", "pack", "ea"}


# ------------------------------------------------------------------ categories
MENU = [  # top categories (website menu order)
    ("custom-orthotics", "Custom Orthotics"),
    ("kidfab", "KidFab"),
    ("baseline-orthotic-components", "Baseline Orthotic Components"),
    ("thermoplastic-ankle-joints", "Thermoplastic Components"),
    ("orthotic-joints-accessories", "Orthotic Joints & Accessories"),
    ("pre-sized-orthotics", "Pre-Sized Orthotics"),
    ("certified-app", "Scan App & CAD"),
]
TOP = {s for s, _ in MENU}


def page_chain(slug):
    chain, guard = [], set()
    while slug and slug in pages and slug not in guard:
        guard.add(slug)
        chain.insert(0, slug)
        slug = pages[slug].get("parent")
    return chain


EXTRA = {  # price-list sections that have no website page
    "kidfab-additions": ("kidfab", "KidFab Additions & Options"),
    "custom-options": ("custom-orthotics", "Additional Options & Repairs"),
    "cad-services": ("certified-app", "CAD Modification Services"),
    "third-party": (None, "Third Party Products"),
    "thermoplastic-other": ("thermoplastic-ankle-joints", "Stops & Other Thermoplastic Components"),
    "tools-accessories": ("orthotic-joints-accessories", "Tools & Accessories"),
}


def categories_for(row):
    """[top, sub] category slugs for a product."""
    if row.get("page"):
        ch = [s for s in page_chain(row["page"]) if s != "home"]
        top = next((s for s in ch if s in TOP), None)
        if top:
            sub = ch[ch.index(top) + 1] if ch.index(top) + 1 < len(ch) else None
            return [top] + ([sub] if sub else [])
    if row["type"] == "thirdparty":
        return ["third-party"]
    sec = ((row.get("section") or "") + " " + (row.get("major") or "")).upper()
    if "THERMOPLASTIC COMPONENTS" in sec:
        return ["thermoplastic-ankle-joints", "thermoplastic-other"]
    if "TOOLS" in sec:
        return ["orthotic-joints-accessories", "tools-accessories"]
    if "KIDFAB" in sec:
        return ["kidfab", "kidfab-additions"]
    if "CAD" in sec:
        return ["certified-app", "cad-services"]
    if "SHOE" in sec:
        return ["custom-orthotics", "shoe-modifications"]
    return ["custom-orthotics", "custom-options"]


def slugify(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")[:80]


# ------------------------------------------------------------------ build
rows = [r for r in catalog if r["kind"] in ("product", "line", "note")]
prods = [r for r in catalog if r["kind"] == "product"]
lines_after = collections.defaultdict(list)
last = None
for r in catalog:
    if r["kind"] == "product":
        last = r
    elif r["kind"] == "line" and last:
        lines_after[id(last)].append(r["text"])
    elif r["kind"] in ("major", "sub", "note"):
        last = None if r["kind"] != "note" else last

groups = collections.OrderedDict()
for r in prods:
    groups.setdefault((r["type"], r["major"], r["sub"]), []).append(r)
notes = collections.defaultdict(list)
for r in catalog:
    if r["kind"] == "note":
        notes[(r["type"], r["major"], r["sub"])].append(r["text"])

products, used_slugs, report = [], set(), []


def uniq(slug):
    base, n = slug or "product", 2
    while slug in used_slugs:
        slug = f"{base}-{n}"; n += 1
    used_slugs.add(slug)
    return slug


def sku_of(r):
    return {
        "sku": r["partNumber"], "name": r["name"], "price": r["price"], "priceLabel": r.get("priceLabel") or "",
        "unit": r["unit"], "type": r["type"], "lines": lines_after.get(id(r), []), "image": r.get("image"),
    }


EXTRA_ATTR = {"duplicate", "custom", "specify", "xx", "w", "m", "wide", "tall", "thick", "regular", "standard", "modular",
              "toddler", "baby", "pk", "x-large", "x-small", "xl", "xs", "bilateral", "universal", "lg", "sm"}
PREFER = ["Side", "Size", "Color", "Height", "Thickness", "Strap Size", "Upright", "AJ Material", "Material",
          "Compartment", "Style", "Women's", "Men's", "Shoe Size", "Shoe Sizing", "Dimension", "Width x Height", "Type", "Description"]


def attr_like(w):
    lw = w.lower().strip(".\"'()")
    return bool(re.search(r"\d", lw)) or lw in EXTRA_ATTR or is_attr_word(lw)


def char_labels(names):
    """the part of each name that differs, with its original punctuation: 'XS (W 4-5.5)'"""
    pre = names[0]
    for n in names[1:]:
        i = 0
        while i < min(len(pre), len(n)) and pre[i].lower() == n[i].lower():
            i += 1
        pre = pre[:i]
    pre = pre[:len(pre) - len(re.split(r"[\s\-–(/,]", pre)[-1])] if pre and not re.search(r"[\s\-–(/,]$", pre) else pre
    rev = [n[::-1] for n in names]
    suf = rev[0]
    for n in rev[1:]:
        i = 0
        while i < min(len(suf), len(n)) and suf[i].lower() == n[i].lower():
            i += 1
        suf = suf[:i]
    suf = suf[:len(suf) - len(re.split(r"[\s\-–)/,]", suf)[-1])] if suf and not re.search(r"[\s\-–)/,]$", suf) else suf
    out = []
    for n in names:
        core = n[len(pre):len(n) - len(suf) if suf else len(n)]
        core = core.strip(" -–,") or n
        if core.count("(") > core.count(")"):
            core += ")"
        out.append(core)
    return out


def labels_for(items):
    words, pre = variant_words([r["name"] for r in items])
    return char_labels([r["name"] for r in items]), words, pre


def is_variable(items):
    if len(items) < 2 or len({r.get("page") for r in items}) > 1:
        return False
    labels, words, pre = labels_for(items)
    if pre < 2 or any(not l for l in labels) or len(set(labels)) != len(labels):
        return False
    if any(len(w) > 7 for w in words):
        return False
    ok = sum(1 for w in words if all(attr_like(x) for x in w))
    return ok / len(items) >= 0.75


def classify(words):
    d = {}
    for w in words:
        lw = w.lower().strip(".\"'()")
        key = next((k for k, st in ATTR_WORDS.items() if lw in st), None)
        if key:
            d[key] = (d.get(key, "") + " " + w).strip()
    return d


def attrs_from_table(items):
    """Attributes from the website table columns – smallest set of columns that tells the SKUs apart.
    SKUs missing from the site table (e.g. Duplicate / Custom rows) get their values from the SKU name."""
    found = [sku_table.get(r["partNumber"]) for r in items]
    present = [f for f in found if f]
    if len(present) < max(2, 0.6 * len(items)) or len({tuple(h) for h, _ in present}) != 1:
        return None
    hdr = present[0][0]
    cells = [c for _, c in present]
    cand = [i for i in range(1, len(hdr)) if hdr[i] and not re.match(r"(?i)^(product|unit)", hdr[i])
            and len({c[i] if i < len(c) else "" for c in cells}) > 1]
    cand.sort(key=lambda i: PREFER.index(hdr[i]) if hdr[i] in PREFER else 99)
    chosen = []
    for i in cand:
        chosen.append(i)
        if len({tuple(c[j] if j < len(c) else "" for j in chosen) for c in cells}) == len(cells):
            break
    if not chosen:
        return None
    names = [{"Description": "Type", "Widh x Height": "Width x Height"}.get(hdr[i], hdr[i]) for i in chosen]
    labels, words, _ = labels_for(items)
    values = []
    for f, lab, ws in zip(found, labels, words):
        if f:
            values.append({n: (f[1][j] if j < len(f[1]) else "") for n, j in zip(names, chosen)})
        else:
            cl = classify(ws)
            v = {n: cl.get(n, "") for n in names}
            if not any(v.values()):
                v[names[0]] = lab or "Other"
            values.append(v)
    combos = [tuple(v[n] for n in names) for v in values]
    if len(set(combos)) != len(combos):
        return None
    return names, values


def attrs_from_names(items):
    labels, words, _ = labels_for(items)
    per = []
    for ws in words:
        d = {}
        for w in ws:
            lw = w.lower().strip(".\"'()")
            key = next((k for k, s in ATTR_WORDS.items() if lw in s), None)
            if key is None:
                d = None
                break
            d[key] = (d.get(key, "") + " " + w).strip()
        per.append(d)
    if all(per):
        keys = [k for k in ("Side", "Size", "Color") if any(k in d for d in per)]
        if all(all(k in d for k in keys) for d in per):
            combos = [tuple(d[k] for k in keys) for d in per]
            if len(set(combos)) == len(combos):
                return keys, [dict(zip(keys, c)) for c in combos]
    return ["Option"], [{"Option": l} for l in labels]


FEAT_RX = re.compile(r"(feature|benefit|indication|highlight|order custom by|uses|ordering information|options|clinical)", re.I)


def flat(blocks):
    """page blocks in reading order (grids/links flattened), stopping at the long SEO article (first <h1>)."""
    out = []
    def rec(bs):
        for b in bs:
            if b["t"] == "grid":
                for col in b["cols"]:
                    rec(col)
            elif b["t"] in ("link", "hero"):
                rec(b["blocks"])
            else:
                out.append(b)
    rec(blocks)
    for i, b in enumerate(out):
        if i > 2 and b["t"] == "heading" and b.get("tag") == "h1":
            return out[:i]
    return out


def text_of_html(h):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h)).strip()


def page_details(slug):
    """Only the general text of a product line page: intro + Features / Indications lists + order forms.
    No pictures or tables of other products."""
    if slug not in pages:
        return None
    bl = flat(pages[slug]["blocks"])
    intro, sections, forms = [], [], []
    cur = None
    seen_table = False
    for b in bl:
        if b["t"] == "table":
            seen_table = True
        if b["t"] == "heading" and b.get("tag") == "p" and len(b["text"]) > 80 and len(intro) < 1:
            intro.append(f"<p>{b['text']}</p>")
            continue
        if b["t"] == "list" and cur is None and not seen_table:
            # bullet points at the top of the page (sizes, colors, closures …)
            if not sections or sections[-1]["title"] != "Product details":
                sections.append({"title": "Product details", "items": [], "html": []})
            sections[-1]["items"].extend(i["text"] for i in b["items"])
            continue
        if b["t"] == "button" and re.search(r"\.pdf$", b.get("href") or "", re.I):
            if (b["href"], b["text"]) not in forms:
                forms.append((b["href"], b["text"]))
            continue
        if b["t"] == "heading":
            cur = {"title": b["text"].rstrip(":"), "items": [], "html": []} if FEAT_RX.search(b["text"]) else None
            if cur:
                sections.append(cur)
            continue
        if cur is not None:
            if b["t"] == "list":
                cur["items"].extend(i["text"] for i in b["items"])
            elif b["t"] == "html":
                lis = re.findall(r"<li>(.*?)</li>", b["html"], re.S)
                if lis:
                    cur["items"].extend(text_of_html(x) for x in lis)
                elif text_of_html(b["html"]):
                    cur["html"].append(b["html"])
            continue
        if b["t"] == "html" and len(intro) < 1 and "<table" not in b["html"] and "<img" not in b["html"]:
            t = text_of_html(b["html"])
            if len(t) > 80:
                intro.append(b["html"])
    sections = [s for s in sections if s["items"] or s["html"]]
    seen, uniq_sections = set(), []
    for s_ in sections:
        k = s_["title"].lower()
        if k not in seen:
            seen.add(k); uniq_sections.append(s_)
    return {"intro": intro, "sections": uniq_sections, "forms": [{"href": h, "text": t} for h, t in forms]}


def specs_for(items):
    """the website table rows of exactly these SKUs (with the site's column names)"""
    out = collections.OrderedDict()
    for r in items:
        f = sku_table.get(r["partNumber"])
        if f:
            hdr, cells = f
            out.setdefault(tuple(hdr), []).append(cells)
    return [{"header": list(h), "rows": rows} for h, rows in out.items()]


def short_desc(slug):
    """first paragraph of the website page"""
    if slug not in pages:
        return ""
    for b in pages[slug]["blocks"][:12]:
        if b["t"] == "html":
            txt = re.sub(r"<[^>]+>", " ", b["html"]); txt = re.sub(r"\s+", " ", txt).strip()
            if len(txt) > 60:
                return txt
    return ""


def images_for(name, items, page):
    imgs = [r["image"] for r in items if r.get("image")]
    if page:
        cap = best_caption_image(name, page)
        if cap:
            imgs.insert(0, cap)
        pimgs = page_images(page)
        cover = pages[page].get("image")
        if not imgs and cover and not LOGO_RX.search(cover):
            imgs.append(cover)
        if not imgs and pimgs:
            imgs.append(pimgs[0])
    out = []
    for u in imgs:
        if u and u not in out:
            out.append(u)
    return out


CAT_FALLBACK_IMG = {}
for top, _ in MENU:
    CAT_FALLBACK_IMG[top] = pages.get(top, {}).get("image")

variable_groups = simple_groups = 0
for key, items in groups.items():
    typ, major, sub = key
    page = items[0].get("page")
    same_page = all(r.get("page") == page for r in items)
    attrs = None
    if len(items) >= 2 and same_page and page:
        attrs = attrs_from_table(items)
    if not attrs and is_variable(items):
        attrs = attrs_from_names(items)
    if attrs:
        variable_groups += 1
        names, values = attrs
        title = sub or " ".join(variant_words([r["name"] for r in items])[0][0])
        cats = categories_for(items[0])
        variations = []
        for r, v in zip(items, values):
            s = sku_of(r); s["attributes"] = v
            variations.append(s)
        prices = [v["price"] for v in variations if v["price"] is not None]
        products.append({
            "slug": uniq(slugify(title)), "kind": "variable", "name": title, "type": typ,
            "section": items[0].get("section"), "group": sub, "categories": cats, "page": page,
            "attributes": [{"name": n, "values": list(dict.fromkeys(v[n] for v in values))} for n in names],
            "variations": variations, "notes": notes.get(key, []),
            "priceMin": min(prices) if prices else None, "priceMax": max(prices) if prices else None,
            "images": images_for(title, items, page), "short": short_desc(page),
            "details": page_details(page), "specs": specs_for(items),
        })
        report.append(f"VARIABLE {len(items):3} | {title} | attrs: {', '.join(names)}")
    else:
        simple_groups += 1
        for r in items:
            pg = r.get("page")
            cats = categories_for(r)
            s = sku_of(r)
            imgs = images_for(r["name"], [r], pg)
            products.append({
                "slug": uniq(slugify(f"{r['partNumber']}-{r['name']}")), "kind": "simple", "name": r["name"], "type": typ,
                "section": r.get("section"), "group": sub, "categories": cats, "page": pg,
                "attributes": [], "variations": [s], "notes": notes.get(key, []),
                "priceMin": r["price"], "priceMax": r["price"],
                "images": imgs, "short": r.get("siteCaption") or short_desc(pg),
                "details": page_details(pg), "specs": specs_for([r]),
            })
        report.append(f"SIMPLE   {len(items):3} | {sub or major} | {', '.join(r['partNumber'] for r in items[:6])}{' …' if len(items) > 6 else ''}")

# Products the website shows no picture for (add-on options, repairs, services, third party)
# get a branded placeholder in the store – never another product's picture.
for p in products:
    if not p["images"]:
        p["imageIsCategory"] = True

# ------------------------------------------------------------------ categories
cats = []
for slug, label in MENU:
    cats.append({"slug": slug, "name": label, "parent": None, "image": pages.get(slug, {}).get("image")})
seen = {c["slug"] for c in cats}
for p in products:
    if len(p["categories"]) > 1:
        top, sub = p["categories"][:2]
        if sub not in seen:
            seen.add(sub)
            name = pages[sub]["title"] if sub in pages else EXTRA.get(sub, (None, sub))[1]
            cats.append({"slug": sub, "name": name, "parent": top, "image": pages.get(sub, {}).get("image")})
if any(p["categories"][0] == "third-party" for p in products):
    cats.append({"slug": "third-party", "name": "Third Party Products", "parent": None, "image": None})
count = collections.Counter(c for p in products for c in p["categories"])
for c in cats:
    c["count"] = count.get(c["slug"], 0)
cats = [c for c in cats if c["count"]]

(SEED / "products.json").write_text(json.dumps(products, ensure_ascii=False, indent=1))
(SEED / "categories.json").write_text(json.dumps(cats, ensure_ascii=False, indent=1))
noimg = [p for p in products if not p["images"]]
summary = [
    f"Products: {len(products)}  (variable: {sum(1 for p in products if p['kind']=='variable')}, simple: {sum(1 for p in products if p['kind']=='simple')})",
    f"SKUs covered: {sum(len(p['variations']) for p in products)} of {len(prods)}",
    f"With own/product-line image: {sum(1 for p in products if p['images'] and not p.get('imageIsCategory'))}, category image: {sum(1 for p in products if p.get('imageIsCategory'))}, none: {len(noimg)}",
    f"Categories: {len(cats)}",
]
(ROOT / "tools/products-report.txt").write_text("\n".join(summary + [""] + report + ["", "No image:"] + [p["name"] for p in noimg]))
print("\n".join(summary))
