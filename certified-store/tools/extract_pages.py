"""
Convert the live certifiedortho.com pages (slimmed Elementor HTML captured from the
live site) into structured content blocks the store can render.

Input : raw/slim_html.json   {slug: html}
Output: ../server/seed/pages.json

Nothing is rewritten: every heading, paragraph, list item, table cell, image and
link is copied exactly as it appears on the live page. Only Elementor wrappers,
carousel duplicates and empty spacers are dropped.
"""
import json, re, sys, html as htmlmod
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag, Comment

HERE = Path(__file__).parent
RAW = json.loads((HERE / "raw/slim_html.json").read_text())
SITE = "https://certifiedortho.com"

ALLOWED_INLINE = {"p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "sup", "sub",
                  "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td",
                  "img", "blockquote", "span", "div", "hr"}


def norm_ws(s):
    return re.sub(r"\s+", " ", s or "").strip()


def text_of(el):
    # Mimic browser innerText closely enough: join inline text, collapse whitespace.
    return norm_ws(el.get_text(" ", strip=False)) if el else ""


def best_src(img):
    src = img.get("data-src") or img.get("data-lazy-src") or img.get("src") or ""
    ss = img.get("srcset") or img.get("data-srcset")
    if ss:
        parts = []
        for p in ss.split(","):
            bits = p.strip().split()
            if len(bits) >= 2 and bits[1].endswith("w"):
                try:
                    parts.append((int(bits[1][:-1]), bits[0]))
                except ValueError:
                    pass
        if parts:
            parts.sort(reverse=True)
            src = parts[0][1]
    if src.startswith("data:"):
        return ""
    return src


def local_link(href):
    """Turn links to live pages into in-store routes; keep files/external as-is."""
    if not href:
        return href
    if href.startswith(SITE):
        path = href[len(SITE):]
        if path.startswith("/wp-content/"):
            return href
        slug = path.strip("/").split("#")[0]
        return "/" if slug == "" else f"/p/{slug}"
    return href


def clean_html(el):
    """Sanitise rich text (text-editor / html widgets) keeping the original wording."""
    soup = BeautifulSoup(str(el), "lxml")
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        c.extract()
    for t in soup.find_all(["script", "style", "i", "svg", "button", "input", "form"]):
        # <i> on this site is only used for icon fonts (empty)
        if t.name == "i" and t.get_text(strip=True):
            t.unwrap()
        else:
            t.decompose()
    body = soup.body or soup
    for t in body.find_all(True):
        if t.name not in ALLOWED_INLINE:
            t.unwrap()
            continue
        attrs = {}
        if t.name == "a" and t.get("href"):
            attrs["href"] = local_link(t["href"])
            if attrs["href"].startswith("http") and not attrs["href"].startswith(SITE):
                attrs["target"] = "_blank"
                attrs["rel"] = "noopener"
            if "/wp-content/" in attrs["href"]:
                attrs["target"] = "_blank"
        if t.name == "img":
            s = best_src(t)
            if not s:
                t.decompose()
                continue
            attrs["src"] = s
            attrs["alt"] = t.get("alt", "")
        if t.name in ("td", "th") and t.get("colspan"):
            attrs["colspan"] = t["colspan"]
        t.attrs = attrs
    # unwrap spans/divs (formatting wrappers only)
    for t in body.find_all(["span", "div"]):
        t.unwrap()
    out = "".join(str(c) for c in body.contents)
    out = re.sub(r"\s+", " ", out)
    out = re.sub(r"<p>\s*</p>", "", out)
    out = re.sub(r">\s+<", "> <", out).strip()
    # drop wrapping noise
    out = out.replace("&nbsp;", " ").replace(" ", " ").strip()
    return out


def widget_type(el):
    return (el.get("data-widget_type") or "").split(".")[0]


def parse_table(tbl):
    rows = []
    for tr in tbl.find_all("tr"):
        cells = [norm_ws(td.get_text(" ")) for td in tr.find_all(["td", "th"])]
        rows.append({"cells": cells, "head": bool(tr.find_parent("thead")) or all(c.name == "th" for c in tr.find_all(["td", "th"]))})
    # remove trailing all-empty columns
    if rows:
        width = max(len(r["cells"]) for r in rows)
        keep = [i for i in range(width) if any(i < len(r["cells"]) and r["cells"][i] for r in rows)]
        for r in rows:
            r["cells"] = [r["cells"][i] if i < len(r["cells"]) else "" for i in keep]
    return [r for r in rows if any(r["cells"])]


def parse_widget(w):
    t = widget_type(w)
    if t == "heading":
        h = w.find(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span"])
        hh = w.find(re.compile(r"^h[1-6]$")) or w.find("p")
        if not hh:
            return []
        txt = text_of(hh)
        if not txt:
            return []
        link = hh.find("a") or (hh.find_parent("a"))
        blk = {"t": "heading", "tag": hh.name, "text": txt}
        if link and link.get("href"):
            blk["href"] = local_link(link["href"])
        return [blk]
    if t == "text-editor":
        inner = w.find("div") or w
        h = clean_html(inner)
        return [{"t": "html", "html": h}] if norm_ws(BeautifulSoup(h, "lxml").get_text()) or "<img" in h else []
    if t == "image":
        img = w.find("img")
        if not img:
            return []
        s = best_src(img)
        if not s:
            return []
        blk = {"t": "image", "src": s, "alt": img.get("alt", "")}
        a = img.find_parent("a")
        if a and a.get("href"):
            blk["href"] = local_link(a["href"])
        cap = w.find("figcaption")
        if cap and text_of(cap):
            blk["caption"] = text_of(cap)
        return [blk]
    if t == "button":
        a = w.find("a")
        txt = text_of(a) if a else text_of(w)
        if not txt:
            return []
        href = a.get("href") if a else ""
        return [{"t": "button", "text": txt, "href": local_link(href or "")}]
    if t == "elementskit-table":
        tbl = w.find("table")
        return [{"t": "table", "rows": parse_table(tbl)}] if tbl else []
    if t == "icon-list":
        items = []
        for li in w.find_all("li"):
            txt = text_of(li)
            if not txt:
                continue
            it = {"text": txt}
            a = li.find("a")
            if a and a.get("href"):
                it["href"] = local_link(a["href"])
            items.append(it)
        return [{"t": "list", "items": items}] if items else []
    if t == "html":
        h = clean_html(w)
        if not norm_ws(BeautifulSoup(h, "lxml").get_text()):
            return []
        return [{"t": "html", "html": h}]
    if t == "slides":
        slides = []
        seen = set()
        # each slide: heading div + description div (+ button)
        for sl in w.select("div > div > div > div > div"):
            pass
        texts = []
        # Elementor slides markup after slimming: <div><div><div><div>HEADING</div><div>DESC</div></div></div></div>
        for inner in w.find_all("div"):
            kids = [k for k in inner.children if isinstance(k, Tag)]
            if len(kids) >= 2 and all(k.name == "div" and not k.find("div") for k in kids):
                key = tuple(text_of(k) for k in kids)
                if key in seen or not any(key):
                    continue
                seen.add(key)
                sl = {"heading": key[0], "text": key[1] if len(key) > 1 else ""}
                a = inner.find("a")
                if a and a.get("href"):
                    sl["href"] = local_link(a["href"])
                    sl["button"] = text_of(a)
                slides.append(sl)
        return [{"t": "slides", "slides": slides}] if slides else []
    if t == "nested-tabs":
        titles = [text_of(b) for b in w.find_all("button")]
        # content containers are the direct element children of the second wrapper
        panes = [c for c in w.find_all(attrs={"data-element_type": "container"}, recursive=True)
                 if not c.find_parent(attrs={"data-element_type": "container"}) or
                 c.find_parent(attrs={"data-element_type": "container"}).find_parent(attrs={"data-widget_type": True}) is None and False]
        # simpler: top-level containers inside the widget
        panes = []
        for c in w.find_all(attrs={"data-element_type": "container"}):
            par = c.find_parent(attrs={"data-element_type": True})
            if par is w:
                panes.append(c)
        tabs = []
        for i, title in enumerate(titles):
            body = parse_container(panes[i]) if i < len(panes) else []
            tabs.append({"title": title, "blocks": body})
        return [{"t": "tabs", "tabs": tabs}] if tabs else []
    if t == "elementskit-accordion":
        items = []
        for a in w.find_all("a", href=re.compile(r"^#collapse")):
            title = text_of(a)
            card = a.find_parent("div").find_parent("div")
            body_div = None
            for sib in a.find_parent("div").find_next_siblings("div"):
                body_div = sib
                break
            h = clean_html(body_div) if body_div else ""
            items.append({"title": title, "html": h})
        return [{"t": "accordion", "items": items}] if items else []
    if t == "image-box":
        img = w.find("img")
        h = w.find(re.compile(r"^h[1-6]$"))
        p = w.find("p")
        blk = {"t": "imagebox"}
        if img and best_src(img):
            blk["src"] = best_src(img)
        if h:
            blk["title"] = text_of(h)
        if p:
            blk["text"] = text_of(p)
        a = w.find("a")
        if a and a.get("href"):
            blk["href"] = local_link(a["href"])
        return [blk] if len(blk) > 1 else []
    if t == "testimonial-carousel":
        # used as a carousel of linked cards (home) – dedupe loop clones
        cards, seen = [], set()
        for a in w.find_all("a", attrs={"data-element_type": "container"}):
            href = a.get("href")
            if href in seen:
                continue
            seen.add(href)
            img = a.find("img")
            h = a.find(re.compile(r"^h[1-6]$"))
            cards.append({"href": local_link(href), "src": best_src(img) if img else "", "title": text_of(h) if h else ""})
        if cards:
            return [{"t": "cards", "cards": cards}]
        return []
    if t in ("spacer", "divider", "search", "nav-menu", "ekit-nav-menu", "social-icons", "form", "icon"):
        return []
    # unknown widget: keep its text as html
    h = clean_html(w)
    return [{"t": "html", "html": h}] if norm_ws(BeautifulSoup(h, "lxml").get_text()) else []


def is_container(el):
    return isinstance(el, Tag) and el.get("data-element_type") == "container"


def is_widget(el):
    return isinstance(el, Tag) and el.get("data-element_type") == "widget"


def direct_elements(el):
    """Direct Elementor children (containers/widgets) skipping plain wrapper divs."""
    out = []
    for c in el.children:
        if not isinstance(c, Tag):
            continue
        if is_container(c) or is_widget(c):
            out.append(c)
        else:
            out.extend(direct_elements(c))
    return out


def parse_container(c):
    kids = direct_elements(c)
    blocks = []
    child_containers = [k for k in kids if is_container(k)]
    if c.get("href") and c.name == "a":
        pass
    # a row of >=2 sibling containers -> grid
    if len(child_containers) >= 2 and len(child_containers) == len(kids):
        cols = [parse_container(k) for k in child_containers]
        cols = [col for col in cols if col]
        if len(cols) >= 2:
            return [{"t": "grid", "cols": cols}]
        return cols[0] if cols else []
    for k in kids:
        if is_widget(k):
            blocks.extend(parse_widget(k))
        else:
            blocks.extend(parse_container(k))
    # container that is itself a link (cards)
    if c.name == "a" and c.get("href") and blocks:
        return [{"t": "link", "href": local_link(c["href"]), "blocks": blocks}]
    return blocks


def background_video(c):
    st = c.get("data-settings") or ""
    m = re.search(r'"background_video_link":"([^"]+)"', st)
    return m.group(1).replace("\\/", "/") if m else None


def parse_page(slug, html):
    soup = BeautifulSoup(html, "lxml")
    for cm in soup.find_all(string=lambda t: isinstance(t, Comment)):
        cm.extract()
    root = soup.body or soup
    if slug == "home":
        art = root.find("article") or root
        root = art
    tops = direct_elements(root)
    blocks = []
    for c in tops:
        if is_container(c):
            vid = background_video(c)
            b = parse_container(c)
            if vid and b:
                blocks.append({"t": "hero", "video": vid, "blocks": b})
            else:
                blocks.extend(b)
        else:
            blocks.extend(parse_widget(c))
    return simplify(blocks)


def simplify(blocks):
    out = []
    for b in blocks:
        if b["t"] == "grid":
            cols = [simplify(c) for c in b["cols"]]
            cols = [c for c in cols if c]
            if len(cols) == 1:
                out.extend(cols[0])
            elif cols:
                out.append({"t": "grid", "cols": cols})
        elif b["t"] in ("link", "hero"):
            b["blocks"] = simplify(b["blocks"])
            out.append(b)
        elif b["t"] == "tabs":
            for tab in b["tabs"]:
                tab["blocks"] = simplify(tab["blocks"])
            out.append(b)
        else:
            out.append(b)
    return out


def all_text(blocks):
    acc = []
    def walk(bs):
        for b in bs:
            t = b["t"]
            if t == "heading": acc.append(b["text"])
            elif t == "html": acc.append(norm_ws(BeautifulSoup(b["html"], "lxml").get_text(" ")))
            elif t == "table":
                for r in b["rows"]: acc.append(" | ".join(r["cells"]))
            elif t == "list": acc.extend(i["text"] for i in b["items"])
            elif t == "button": acc.append(b["text"])
            elif t in ("grid",):
                for c in b["cols"]: walk(c)
            elif t in ("link", "hero"): walk(b["blocks"])
            elif t == "tabs":
                for tab in b["tabs"]: acc.append(tab["title"]); walk(tab["blocks"])
            elif t == "accordion":
                for it in b["items"]: acc.append(it["title"]); acc.append(norm_ws(BeautifulSoup(it["html"], "lxml").get_text(" ")))
            elif t == "slides":
                for s in b["slides"]: acc.append(s["heading"]); acc.append(s["text"])
            elif t == "cards":
                for c in b["cards"]: acc.append(c["title"])
            elif t == "imagebox":
                acc.append(b.get("title", "")); acc.append(b.get("text", ""))
    walk(blocks)
    return acc


def all_images(blocks):
    acc = []
    def walk(bs):
        for b in bs:
            t = b["t"]
            if t == "image": acc.append(b["src"])
            elif t == "html": acc.extend(re.findall(r'<img src="([^"]+)"', b["html"]))
            elif t == "grid":
                for c in b["cols"]: walk(c)
            elif t in ("link", "hero"): walk(b["blocks"])
            elif t == "tabs":
                for tab in b["tabs"]: walk(tab["blocks"])
            elif t == "cards": acc.extend(c["src"] for c in b["cards"] if c["src"])
            elif t == "imagebox" and b.get("src"): acc.append(b["src"])
    walk(blocks)
    return acc


if __name__ == "__main__":
    titles = {}
    pages = {}
    for slug, html in RAW.items():
        pages[slug] = parse_page(slug, html)
    out = HERE.parent / "server/seed"
    out.mkdir(parents=True, exist_ok=True)
    (out / "pages_blocks.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1))
    n_img = sum(len(set(all_images(b))) for b in pages.values())
    print("pages", len(pages), "images", n_img)
