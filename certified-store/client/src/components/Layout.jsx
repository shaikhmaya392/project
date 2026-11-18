import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Phone, Mail, ChevronDown, Menu, X, LogOut, Package, MapPin } from 'lucide-react';
import { useAuth, useCart, useSite, shopHref } from '../lib/store.jsx';
import { media } from '../lib/format.js';

export function Header() {
  const site = useSite();
  const { user, openAuth, logout } = useAuth();
  const { count, setOpen } = useCart();
  const [q, setQ] = useState('');
  const [mobile, setMobile] = useState(false);
  const [acct, setAcct] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const acctRef = useRef(null);

  useEffect(() => { setMobile(false); setAcct(false); }, [loc.pathname]);
  useEffect(() => {
    const h = (e) => acctRef.current && !acctRef.current.contains(e.target) && setAcct(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="container topbar-in">
          <div className="topbar-contact">
            <a href="tel:9704827116"><Phone size={14} /> 970-482-7116</a>
            <span className="hide-sm">Toll free 800-466-7015</span>
            <a href="mailto:info@certifiedortho.com" className="hide-sm"><Mail size={14} /> info@certifiedortho.com</a>
          </div>
          <div className="topbar-right">
            {!user && <button className="linkbtn" onClick={() => openAuth('request')}>Request an account</button>}
            <Link to="/shop">Shop</Link>
            <Link to="/catalog">Full price list</Link>
          </div>
        </div>
      </div>
      <div className="mainbar">
        <div className="container mainbar-in">
          <button className="iconbtn only-mobile" aria-label="Menu" onClick={() => setMobile((v) => !v)}>{mobile ? <X /> : <Menu />}</button>
          <Link to="/" className="logo" aria-label="Certified Ortho home">
            {site?.logoWhite && <img src={media(site.logoWhite)} alt="Certified Orthopedics Inc." />}
          </Link>
          <form className="searchbox" onSubmit={submit} role="search">
            <Search size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, part numbers…" aria-label="Search" />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <div className="mainbar-actions">
            {user ? (
              <div className="acct" ref={acctRef}>
                <button className="acct-btn" onClick={() => setAcct((v) => !v)}>
                  <span className="avatar">{(user.name || user.email)[0].toUpperCase()}</span>
                  <span className="acct-name hide-sm">{user.name || user.email}</span>
                  <ChevronDown size={15} />
                </button>
                {acct && (
                  <div className="acct-menu">
                    <div className="acct-menu-head">
                      <b>{user.businessName || user.name}</b>
                      <span>{user.email}</span>
                    </div>
                    <Link to="/account"><User size={16} /> My account</Link>
                    <Link to="/account/orders"><Package size={16} /> My orders</Link>
                    <button onClick={async () => { await logout(); nav('/'); }}><LogOut size={16} /> Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => openAuth('login')}><User size={16} /> Log in</button>
            )}
            <button className="cartbtn" onClick={() => setOpen(true)} aria-label={`Cart, ${count} items`}>
              <ShoppingCart size={21} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </button>
          </div>
        </div>
      </div>
      <nav className={`mainnav ${mobile ? 'open' : ''}`} aria-label="Main">
        <div className="container">
          <ul>
            {(site?.menu || []).map((m) => (
              <li key={m.label} className={m.children ? 'has-sub' : ''}>
                {m.children ? (
                  <>
                    <span className="navlink" tabIndex={0}>{m.label} <ChevronDown size={14} /></span>
                    <ul className="submenu">
                      {m.children.map((c) => <li key={c.href}><Link to={shopHref(c.href, site)}>{c.label}</Link></li>)}
                    </ul>
                  </>
                ) : (
                  <Link to={shopHref(m.href, site)} className="navlink">{m.label}</Link>
                )}
              </li>
            ))}
            <li className="nav-shop"><NavLink to="/shop" className="navlink">Shop All Products</NavLink></li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

export function AppPromo() {
  // "Download Our App" section shown on every page of certifiedortho.com
  return (
    <section className="app-promo">
      <div className="container app-promo-in">
        <div>
          <h2>Download Our App</h2>
          <p>The Certified Ortho App allows for a Turn Key Ordering Process. With access to 3D Scanning, Fillable Order Forms, and our Camera Feature, you can now upload and send all ordering information simultaneously through the app. The Certified Ortho App can be found in the App store and downloaded free of charge.</p>
          <Link className="btn btn-white" to="/shop?category=certified-app">Download Now</Link>
        </div>
        <img src={media('https://certifiedortho.com/wp-content/uploads/2025/04/Code.jpeg')} alt="Certified Ortho App QR code" loading="lazy" />
      </div>
    </section>
  );
}

export function Footer() {
  const site = useSite();
  const c = site?.contact || {};
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          {site?.logoWhite && <img className="footer-logo" src={media(site.logoWhite)} alt="Certified Orthopedics Inc." loading="lazy" />}
          <ul className="footer-contact">
            <li><Phone size={15} /> <a href={`tel:${(c.phone || '').replace(/\D/g, '')}`}>{c.phone}</a></li>
            <li><Mail size={15} /> <a href={`mailto:${c.email}`}>{c.email}</a></li>
            <li><MapPin size={15} /> {c.address}</li>
          </ul>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/shop?category=custom-orthotics">Custom Orthotics</Link></li>
            <li><Link to="/shop?category=kidfab">KidFab</Link></li>
            <li><Link to="/shop?category=baseline-orthotic-components">Baseline Orthotic Components</Link></li>
            <li><Link to="/shop?category=thermoplastic-ankle-joints">Thermoplastic Components</Link></li>
            <li><Link to="/shop?category=orthotic-joints-accessories">Orthotic Joints &amp; Accessories</Link></li>
            <li><Link to="/shop?category=pre-sized-orthotics">Pre-Sized Orthotics</Link></li>
            <li><Link to="/shop">Shop all products</Link></li>
            <li><Link to="/catalog">Full price list</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link to="/about-us">About Us</Link></li>
            <li><Link to="/shop?category=certified-app">Scan App &amp; CAD</Link></li>
            <li><Link to="/contact-us">Contact Us</Link></li>
            <li><Link to="/account">My account</Link></li>
          </ul>
        </div>
        <div>
          <h4>Social Links</h4>
          <ul>
            {(site?.social || []).map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="footer-bottom"><div className="container">{site?.copyright}</div></div>
    </footer>
  );
}
