import "./globals.css";
import NavLinks from "./NavLinks";

export const metadata = {
  title: "DS Permitting CRM",
  description: "Leads and permit pipeline dashboard for DS Permitting Services",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <div className="brand">
              <img src="/logo.png" alt="DS Permitting Services" />
              <div className="brand-text">
                <div className="brand-name">DS Permitting</div>
                <div className="brand-sub">CRM</div>
              </div>
            </div>
            <NavLinks />
            <div className="sidebar-footer">
              DS Permitting Services
              <br />
              Fort McCoy, FL
            </div>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
