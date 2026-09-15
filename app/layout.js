import "./globals.css";

export const metadata = {
  title: "DS Permitting CRM",
  description: "Leads dashboard for DS Permitting Services",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <h1>DS Permitting CRM</h1>
            <nav>
              <a href="/leads">Leads</a>
              <a href="/leads/new">+ New Lead</a>
            </nav>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
