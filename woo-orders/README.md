# WooCommerce Orders Dashboard (Vercel)

Aap ki WooCommerce site par jo bhi order aayega, wo is dashboard par apne aap dikh jayega. Page har 60 second baad naye orders khud check karta hai.

## Step 1: WooCommerce mein API key banayein
1. WordPress admin mein jayein: **WooCommerce → Settings → Advanced → REST API**
2. **Add key** par click karein.
3. Description mein `Vercel Dashboard` likhein, User mein admin chunein, aur **Permissions: Read** rakhein.
4. **Generate API key** dabayein.
5. **Consumer key** (`ck_...`) aur **Consumer secret** (`cs_...`) copy kar ke kahin sambhal lein. Secret dobara nazar nahi aayega.

> Agar `/wp-json/` par error aaye to **Settings → Permalinks** mein "Post name" select kar ke Save karein.

## Step 2: Vercel par upload karein
**Tareeqa A (GitHub ke zariye):**
1. GitHub par naya repository banayein aur is folder ki saari files upload kar dein.
2. vercel.com par jayein, phir **Add New → Project**, aur wohi repo **Import** karein.

**Tareeqa B (bina GitHub ke):**
```
npm i -g vercel
cd woo-orders
vercel
```

## Step 3: Environment Variables daalein
Vercel mein **Project → Settings → Environment Variables** mein ye daalein:

| Name | Value |
|---|---|
| `ADMIN_USER` | dashboard ka username jo aap rakhna chahein |
| `ADMIN_PASS` | mazboot password |
| `SESSION_SECRET` | (optional) koi bhi lamba random text (32+ characters) |
| `WC_URL` | `https://poellertechnologies.com` |
| `WC_KEY` | `ck_...` |
| `WC_SECRET` | `cs_...` |

Ek se zyada WooCommerce sites ho to `WC_URL_2`, `WC_KEY_2`, `WC_SECRET_2` daalein. Isi tarah 5 sites tak add kar sakte hain. Dashboard sab sites ke orders ek saath dikhayega.

Variables save karne ke baad **Deployments → Redeploy** zaroor karein.

## Pages
- `/login` – login page (username + password)
- `/` – dashboard. Login ke baghair kholein to khud `/login` par chala jata hai.

## Files
- `login.html` – login page
- `index.html` – dashboard (table, filter, download)
- `api/login.js` – login check
- `api/orders.js` – WooCommerce se orders lata hai
- `api/logout.js` – logout
- `api/_lib.js` – login session aur settings ke helpers

Aap ki API keys sirf Vercel ke server par rehti hain. Browser mein kabhi nazar nahi aatin.
