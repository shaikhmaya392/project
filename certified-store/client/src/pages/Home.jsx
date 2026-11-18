import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Mail, Check, ShieldCheck, Truck, FileText } from 'lucide-react';
import { api } from '../lib/api.js';
import { media, videoPoster } from '../lib/format.js';
import { RequestAccountForm } from '../components/AuthModal.jsx';
import { useAuth } from '../lib/store.jsx';
import { CategoryTiles } from './Shop.jsx';
import ProductSlider from '../components/ProductSlider.jsx';

export default function Home() {
  const [blocks, setBlocks] = useState(null);
  const { user } = useAuth();
  useEffect(() => { api.get('/home').then((d) => setBlocks(d.blocks)).catch(() => setBlocks([])); }, []);
  const hero = blocks?.find((b) => b.t === 'hero');

  return (
    <div className="home">
      <section className="hero">
        {hero?.video && <video className="hero-video" src={media(hero.video)} poster={videoPoster(hero.video)} preload="auto" autoPlay muted loop playsInline aria-hidden="true" />}
        <div className="hero-shade" />
        <div className="container hero-in">
          <span className="eyebrow">Certified Orthopedics · Fort Collins, Colorado</span>
          <h1>Perfect Fit, Every Step of the Way</h1>
          <p>Explore custom orthotics, prefabricated options, and premium components for unmatched support and comfort.</p>
          <div className="hero-cta">
            <Link to="/shop" className="btn btn-primary btn-lg">Shop all products <ArrowRight size={18} /></Link>
            <Link to="/about-us" className="btn btn-white btn-lg">About Us</Link>
          </div>
          <div className="hero-points">
            <span><ShieldCheck size={16} /> Accounts for practices &amp; clinicians</span>
            <span><FileText size={16} /> Invoice billing – no card needed</span>
            <span><Truck size={16} /> Track every order online</span>
          </div>
        </div>
      </section>

      <section className="section section-tight">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Shop by <span className="accent">Category</span></h2>
              <p>Every Certified Ortho product with its sizes, colors and prices – choose, add to cart and order online.</p>
            </div>
            <Link to="/shop" className="btn btn-outline">All products <ArrowRight size={16} /></Link>
          </div>
          <CategoryTiles />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Custom <span className="accent">Orthotics</span></h2>
              <p>Custom-made orthotic devices designed for specific patients based on casts, measurements, or digital scans.</p>
            </div>
            <Link to="/shop?category=custom-orthotics" className="btn btn-outline">View all <ArrowRight size={16} /></Link>
          </div>
          <ProductSlider query="category=custom-orthotics&exclude=custom-options,shoe-modifications,pre-made-straps-and-pads" />
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
          <ProductSlider query="category=baseline-orthotic-components" interval={3800} />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>Prefabricated <span className="accent">(Pre-Sized) Orthotics</span></h2>
              <p>Ready-made orthotic devices available in standardized sizes.</p>
            </div>
            <Link to="/shop?category=pre-sized-orthotics" className="btn btn-outline">View all <ArrowRight size={16} /></Link>
          </div>
          <ProductSlider query="category=pre-sized-orthotics" interval={4100} />
        </div>
      </section>

      <section className="section kidfab-band">
        <div className="container">
          <div className="kidfab-head">
            <div className="kidfab-logo"><img src={media('https://certifiedortho.com/wp-content/uploads/2025/11/kidlogo111.webp')} alt="KidFab" loading="lazy" /></div>
            <div className="kidfab-copy">
              <span className="eyebrow">Pediatric line</span>
              <h2>KidFab</h2>
              <p>KIDFAB - Pediatric Custom Fabrication: UCBL’s, Low-Tone, Standard and Toe Walking SMO’s, AFO’s &amp; SMO/AFO’s, Skeleton Style AFO’s, GO AFO’s, Dynamic Stretch AFO’s and HI-FIVE SEWHO’s.</p>
            </div>
            <Link to="/shop?category=kidfab" className="btn btn-white kidfab-cta">Shop KidFab <ArrowRight size={16} /></Link>
          </div>
          <ProductSlider query="category=kidfab&exclude=kidfab-additions" interval={4400} />
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
