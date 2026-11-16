import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, Check, ShieldCheck, Truck, FileText } from 'lucide-react';
import { api } from '../lib/api.js';
import { media } from '../lib/format.js';
import { CardLinks } from '../components/Blocks.jsx';
import { RequestAccountForm } from '../components/AuthModal.jsx';
import { useAuth } from '../lib/store.jsx';

// helpers to read the live home page sections (text kept exactly as on certifiedortho.com)
const findCards = (blocks, n) => blocks.filter((b) => b.t === 'cards')[n]?.cards || [];
const gridLinks = (blocks) => {
  const g = blocks.find((b) => b.t === 'grid' && b.cols.every((c) => c.length === 1 && c[0].t === 'link'));
  return (g?.cols || []).map((c) => {
    const l = c[0];
    return { href: l.href, src: l.blocks.find((x) => x.t === 'image')?.src, title: l.blocks.find((x) => x.t === 'heading')?.text };
  });
};

export default function Home() {
  const [blocks, setBlocks] = useState(null);
  const { user } = useAuth();
  useEffect(() => { api.get('/home').then((d) => setBlocks(d.blocks)).catch(() => setBlocks([])); }, []);
  const hero = blocks?.find((b) => b.t === 'hero');
  const custom = blocks ? findCards(blocks, 0) : [];
  const presized = blocks ? findCards(blocks, 1) : [];
  const components = blocks ? gridLinks(blocks) : [];

  return (
    <div className="home">
      <section className="hero">
        {hero?.video && <video className="hero-video" src={media(hero.video)} autoPlay muted loop playsInline aria-hidden="true" />}
        <div className="hero-shade" />
        <div className="container hero-in">
          <span className="eyebrow">Certified Orthopedics · Fort Collins, Colorado</span>
          <h1>Perfect Fit, Every Step of the Way</h1>
          <p>Explore custom orthotics, prefabricated options, and premium components for unmatched support and comfort.</p>
          <div className="hero-cta">
            <Link to="/catalog" className="btn btn-primary btn-lg">Shop all products <ArrowRight size={18} /></Link>
            <Link to="/p/about-us" className="btn btn-white btn-lg">About Us</Link>
          </div>
          <div className="hero-points">
            <span><ShieldCheck size={16} /> Accounts for practices &amp; clinicians</span>
            <span><FileText size={16} /> Invoice billing – no card needed</span>
            <span><Truck size={16} /> Track every order online</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Custom <span className="accent">Orthotics</span></h2>
              <p>Custom-made orthotic devices designed for specific patients based on casts, measurements, or digital scans.</p>
            </div>
            <Link to="/p/custom-orthotics" className="btn btn-outline">View all <ArrowRight size={16} /></Link>
          </div>
          <CardLinks cards={custom} />
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Orthotic <span className="accent">COMPONENTS</span></h2>
              <p>Parts used in the fabrication of orthotic devices.</p>
            </div>
          </div>
          <CardLinks cards={components} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Prefabricated <span className="accent">(Pre-Sized) Orthotics</span></h2>
              <p>Ready-made orthotic devices available in standardized sizes.</p>
            </div>
            <Link to="/p/pre-sized-orthotics" className="btn btn-outline">View all <ArrowRight size={16} /></Link>
          </div>
          <CardLinks cards={presized} />
        </div>
      </section>

      <section className="section kidfab-band">
        <div className="container kidfab-in">
          <img src={media('https://certifiedortho.com/wp-content/uploads/2025/11/kidlogo111.webp')} alt="KidFab" loading="lazy" />
          <div>
            <h2>KidFab</h2>
            <p>KIDFAB – Pediatric Custom Fabrication.</p>
            <Link to="/p/kidfab" className="btn btn-white">Explore KidFab <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {!user && (
        <section className="section section-alt" id="connect">
          <div className="container connect">
            <div>
              <span className="eyebrow dark">work with us</span>
              <h2>Connect With Us</h2>
              <p>Open an account and start ordering custom orthotics, pediatric KidFab devices, components and pre-sized orthotics from our Fort Collins, Colorado lab. Tell us about your practice and our team will reach out.</p>
              <ul className="checklist">
                <li><Check size={16} />Custom and pre-sized orthotics made for your patients</li>
                <li><Check size={16} />KidFab pediatric line for your youngest patients</li>
                <li><Check size={16} />Scan app and CAD to send orders from your clinic</li>
              </ul>
              <p className="lead">Prefer to talk to someone?</p>
              <ul className="contact-list">
                <li><Phone size={16} /> <a href="tel:9704827116">970-482-7116</a> · Toll free 800-466-7015</li>
                <li><Mail size={16} /> <a href="mailto:info@certifiedortho.com">info@certifiedortho.com</a></li>
              </ul>
            </div>
            <div className="card pad"><RequestAccountForm compact /></div>
          </div>
        </section>
      )}
    </div>
  );
}
