"""End-to-end test of the store against the mock CRM (python3 tools/e2e_test.py)."""
import json, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5050"
MOCK = "http://localhost:5099"
OUT = Path("/home/claude/certified-store/tools/screens"); OUT.mkdir(exist_ok=True)
PNG = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
       b"\x00\x00\x00\x0cIDATx\x9cc\xd8\xdd\xe8\x07\x00\x02\xd6\x01\x6e\xc3\x9e\x0c\x1c\x00\x00\x00\x00IEND\xaeB`\x82")


def getj(url):
    return json.load(urllib.request.urlopen(url))


def postj(url, data=None):
    req = urllib.request.Request(url, data=json.dumps(data or {}).encode(), headers={"Content-Type": "application/json"}, method="POST")
    return json.load(urllib.request.urlopen(req))


def stub_media(route):
    # the sandbox cannot reach certifiedortho.com – serve a grey pixel for images
    route.fulfill(status=200, content_type="image/png", body=PNG)


import subprocess
subprocess.run(["node", "-e", "const m=require('mongoose');m.connect('mongodb://127.0.0.1:27017/certified_store').then(async()=>{for(const c of ['customers','accountrequests','orders','outboxes','counters'])await m.connection.db.collection(c).deleteMany({});process.exit(0)})"], cwd="/home/claude/certified-store/server", check=True)
subprocess.run("pkill -f '^node tools/mock-crm'; sleep 0.5; (nohup node tools/mock-crm.mjs > /tmp/mock.log 2>&1 &); sleep 1", shell=True, cwd="/home/claude/certified-store")

ok = []
def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    ok.append(cond)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1366, "height": 860})
    ctx.route(re.compile(r"https://(certifiedortho\.com|fonts\.(googleapis|gstatic)\.com)/.*"), stub_media)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))

    pg.goto(BASE + "/")
    pg.wait_for_selector(".cat-card")
    check(pg.locator("h1").first.inner_text() == "Perfect Fit, Every Step of the Way", "home hero text")
    check(pg.locator(".cat-card").count() >= 20, f"home category cards ({pg.locator('.cat-card').count()})")
    pg.screenshot(path=str(OUT / "01-home.png"), full_page=False)

    # product page
    pg.goto(BASE + "/p/stabilizer-leather-afos")
    pg.wait_for_selector("#order")
    check(pg.locator(".page-band h1").inner_text() == "Stabilizer Leather AFO’s", "product title")
    check("The Stabilizer Leather AFO System is a comprehensive custom product line" in pg.content(), "product description text")
    pg.evaluate("document.querySelectorAll('#order button.opt-group-title:not(.on)').forEach(b=>b.click())")
    pg.wait_for_timeout(300)
    rows = pg.locator("#order .opt-row:not(.opt-hdr)").count()
    check(rows == 35, f"order options rows = {rows}")
    pg.screenshot(path=str(OUT / "02-product.png"), full_page=False)
    pg.locator("#order").scroll_into_view_if_needed()
    pg.screenshot(path=str(OUT / "03-product-options.png"), full_page=False)

    # guest add to cart → login popup
    pg.locator(".sku-buy").first.locator("button.btn-primary").click()
    pg.wait_for_selector(".modal")
    check("Log in to buy" in pg.locator(".modal").inner_text(), "login popup after add to cart")
    pg.screenshot(path=str(OUT / "04-login-popup.png"))

    # request an account
    pg.get_by_role("button", name="Request an account").last.click()
    pg.wait_for_selector(".request-form")
    time.sleep(2.1)
    pg.get_by_label("Business Name *").fill("Rocky Mountain O&P")
    pg.get_by_label("Phone *").fill("303-555-0101")
    pg.get_by_label("Email *").fill("jane@rmop-demo.com")
    pg.get_by_label("Person Name *").fill("Jane Carter")
    pg.get_by_label("Person Title").fill("CPO")
    pg.get_by_label("Where did you hear about us?").select_option("Trade show / Conference")
    pg.get_by_label("Message / Note").fill("We would like to order Stabilizer AFOs online.")
    pg.screenshot(path=str(OUT / "05-request-form.png"))
    pg.get_by_role("button", name="Send Request").click()
    pg.wait_for_selector("text=Thank you!")
    check(True, "request submitted – thank you shown")
    leads = getj(MOCK + "/__db")["leads"]
    check(len(leads) == 1 and leads[0]["businessName"] == "Rocky Mountain O&P" and "[Online store" in leads[0]["message"], "lead reached CRM public endpoint")
    pg.keyboard.press("Escape")

    # admin creates the login linked to a CRM customer
    ad = ctx.new_page()
    ad.goto(BASE + "/admin")
    ad.get_by_label("Email").fill("owner@certifiedortho.com")
    ad.get_by_label("Password").fill("AdminPass123")
    ad.locator("#content").get_by_role("button", name="Log in").click()
    ad.wait_for_selector(".stats")
    check("CRM connected" in ad.content(), "admin dashboard: CRM connected")
    ad.screenshot(path=str(OUT / "06-admin-dashboard.png"))
    ad.goto(BASE + "/admin/requests")
    ad.wait_for_selector("text=Rocky Mountain O&P")
    ad.get_by_role("button", name="Create login").click()
    ad.wait_for_selector(".crm-item")
    ad.locator(".crm-item", has_text="Rocky Mountain Orthotics").click()
    ad.screenshot(path=str(OUT / "07-admin-create-login.png"))
    ad.get_by_role("button", name="Create login & email it").click()
    ad.wait_for_selector("text=approved")
    # read the temporary password from the store's email outbox
    ad.goto(BASE + "/admin/emails")
    ad.wait_for_selector("table.data")
    outbox = ad.evaluate("fetch('/api/admin/outbox').then(r=>r.json())")
    cred = next(m for m in outbox if m["kind"] == "credentials")
    pw = re.search(r'font-size:15px">([^<]+)</b>', cred["html"]).group(1)
    check(cred["to"] == "jane@rmop-demo.com" and "Jane Carter" in cred["html"], "credentials email has name, email & password")
    kinds = sorted(m["kind"] for m in outbox)
    check({"account-request", "account-request-received", "credentials"} <= set(kinds), f"emails: {kinds}")

    # customer logs in (cart still has SLA-10)
    pg.goto(BASE + "/?login=1")
    pg.wait_for_selector(".modal")
    pg.locator(".modal").get_by_label("Email").fill("jane@rmop-demo.com")
    pg.locator(".modal").get_by_label("Password").fill(pw)
    pg.locator(".modal").get_by_role("button", name="Log in").click()
    pg.wait_for_selector("text=Choose your password")
    pg.get_by_label("Temporary password").fill(pw)
    pg.get_by_label("New password (8+ characters)").fill("JaneStrong2026")
    pg.get_by_label("Confirm new password").fill("JaneStrong2026")
    pg.get_by_role("button", name="Save password").click()
    pg.wait_for_selector("text=Choose your password", state="detached")
    check(True, "first login + password change")

    # add more items as logged-in customer
    pg.goto(BASE + "/p/3-buckle-4-buckle-and-5-buckleleather-knee-pads")
    pg.wait_for_selector("#order button.opt-group-title")
    pg.locator("#order button.opt-group-title", has_text="4 Buckle Knee Pad").click(force=True)
    row = pg.locator("#order .opt-row", has_text="A-27M-BR").first
    row.locator(".qty input").fill("2")
    row.locator("button.btn-primary").click()
    pg.wait_for_selector(".drawer")
    pg.screenshot(path=str(OUT / "08-cart-drawer.png"))
    check(pg.locator(".cart-line").count() == 2, "cart has 2 lines")
    pg.get_by_role("button", name="Checkout").click()
    pg.wait_for_selector(".radio-card")
    pg.locator(".radio-card").nth(1).click()
    pg.get_by_label("P.O #").fill("PO-7781")
    pg.get_by_label("Patient name").fill("J. Doe")
    pg.get_by_label("Note for Certified Ortho").fill("Left side, size per attached form")
    pg.set_input_files("input[type=file]", files=[{"name": "SLA-order-form.pdf", "mimeType": "application/pdf", "buffer": b"%PDF-1.4 test"}])
    est = pg.locator(".row-between.total b").inner_text()
    pg.screenshot(path=str(OUT / "09-checkout.png"), full_page=True)
    pg.get_by_role("button", name="Place order").click()
    pg.wait_for_selector("text=Thank you for your order!")
    pg.screenshot(path=str(OUT / "10-order-placed.png"))
    q = getj(MOCK + "/__db")["quotes"]
    check(len(q) == 1, "CRM quote created")
    q = q[0]
    items = {i["productNumber"]: i for i in q["items"]}
    check(items["SLA-10"]["unitPrice"] == 325 and items["SLA-10"]["discountPercent"] == 5 and items["SLA-10"]["product"], "SLA-10 price 325, custom discount 5%, CRM product id")
    check(items["A-27M-BR"]["quantity"] == 2 and items["A-27M-BR"]["discountPercent"] == 10, "A-27M-BR qty 2, general discount 10%")
    check(q["poNumber"] == "PO-7781" and q["patientName"] == "J. Doe" and "Boulder" in q["shipTos"][0]["company"], "PO, patient, chosen ship-to sent")
    check(est == "$" + format(325 * 0.95 + items["A-27M-BR"]["unitPrice"] * 2 * 0.9, ",.2f"), f"estimated total shown {est}")
    check(len(getj(MOCK + "/__db")["documents"]) == 1, "order form attached to CRM quote")

    # portal before processing
    pg.goto(BASE + "/account/orders")
    pg.wait_for_selector("table.data")
    check("Received – being reviewed" in pg.content(), "order status: received")
    # CRM team processes: quote → work order → shipped → invoice
    postj(MOCK + f"/__process/{q['_id']}")
    pg.reload()
    pg.wait_for_selector("table.data")
    check("Invoiced" in pg.content(), "order status: invoiced")
    pg.locator("table.data a.pn").first.click()
    pg.wait_for_selector(".timeline")
    pg.screenshot(path=str(OUT / "11-order-detail.png"), full_page=True)
    check(pg.locator(".timeline li.done").count() == 5, "timeline: placed, received, processing, shipped, invoiced")
    check("Invoice INV-" in pg.content() and pg.locator(".docs a").count() == 1, "invoice block + invoice PDF download shown")
    r = pg.request.get(BASE + pg.locator(".docs a").first.get_attribute("href"))
    check(r.ok and r.body().startswith(b"%PDF"), "invoice PDF downloads through the store")
    pg.goto(BASE + "/account/invoices")
    pg.wait_for_selector("table.data")
    pg.screenshot(path=str(OUT / "12-invoices.png"), full_page=True)
    check("Sent" in pg.content(), "invoice listed with status")

    pg.goto(BASE + "/catalog")
    pg.wait_for_selector(".pl-row:not(.pl-hdr)")
    n = pg.locator(".pl-row:not(.pl-hdr)").count()
    check(n == 1221, f"full price list rows = {n}")
    pg.screenshot(path=str(OUT / "13-catalog.png"))
    pg.goto(BASE + "/search?q=cinch%20stop")
    try:
        pg.wait_for_selector(".pl-row:not(.pl-hdr)", timeout=10000)
    except Exception:
        print("SEARCH PAGE TEXT:", pg.locator("body").inner_text()[:1500])
        raise
    pg.screenshot(path=str(OUT / "14-search.png"))

    # contact form
    pg.goto(BASE + "/p/contact-us")
    pg.wait_for_selector(".contact-form")
    time.sleep(2.1)
    pg.locator(".contact-form").get_by_label("Name").fill("Tom")
    pg.locator(".contact-form").get_by_label("Email *").fill("tom@example.com")
    pg.locator(".contact-form").get_by_label("Message").fill("Do you ship to Utah?")
    pg.locator(".contact-form").get_by_role("button", name="Send").click()
    pg.wait_for_selector("text=your message was sent")
    check(True, "contact form sends")
    pg.screenshot(path=str(OUT / "16-contact.png"), full_page=True)

    # mobile
    m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    m.route(re.compile(r"https://(certifiedortho\.com|fonts\.(googleapis|gstatic)\.com)/.*"), stub_media)
    mp = m.new_page()
    mp.goto(BASE + "/p/baseline-double-action")
    mp.wait_for_selector("#order")
    mp.screenshot(path=str(OUT / "15-mobile-product.png"), full_page=False)
    check(not errors, f"no JS errors {errors[:3]}")
    b.close()

print(f"\n{sum(1 for x in ok if x)}/{len(ok)} checks passed")
sys.exit(0 if all(ok) else 1)
