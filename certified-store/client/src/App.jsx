import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Header, Footer, AppPromo } from './components/Layout.jsx';
import AuthModal, { ChangePasswordGate } from './components/AuthModal.jsx';
import CartDrawer from './components/Cart.jsx';
import Home from './pages/Home.jsx';
import ProductPage from './pages/ProductPage.jsx';
import Catalog from './pages/Catalog.jsx';
import Shop from './pages/Shop.jsx';
import SingleProduct from './pages/SingleProduct.jsx';
import SearchPage from './pages/Search.jsx';
import { CartPage, Checkout, OrderPlaced } from './pages/Checkout.jsx';
import { AccountLayout, AccountOverview, AccountOrders, OrderDetail, AccountInvoices, AccountProfile } from './pages/Account.jsx';
import Admin from './pages/Admin.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import NotFound from './pages/NotFound.jsx';
import { useAuth, useSite, pageHref } from './lib/store.jsx';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function LoginFromLink() {
  // links in the welcome email: /?login=1
  const [sp] = useSearchParams();
  const { user, openAuth } = useAuth();
  useEffect(() => { if (sp.get('login') && user === null) openAuth('login'); }, [sp, user, openAuth]);
  return null;
}

/** old copied-website address /p/<slug> → its shop category / product line / product */
function OldPage() {
  const { slug } = useParams();
  const site = useSite();
  if (!site) return <div className="container pad-y"><div className="skeleton tall" /></div>;
  return <Navigate to={pageHref(slug, site)} replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const admin = pathname.startsWith('/admin');
  return (
    <>
      <ScrollTop />
      <LoginFromLink />
      <Header />
      <main id="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about-us" element={<ProductPage slug="about-us" />} />
          <Route path="/contact-us" element={<ProductPage slug="contact-us" />} />
          <Route path="/p/:slug" element={<OldPage />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<SingleProduct />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-placed/:id" element={<OrderPlaced />} />
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<AccountOverview />} />
            <Route path="orders" element={<AccountOrders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="invoices" element={<AccountInvoices />} />
            <Route path="profile" element={<AccountProfile />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!admin && <AppPromo />}
      <Footer />
      <CartDrawer />
      <AuthModal />
      <ChangePasswordGate />
    </>
  );
}
