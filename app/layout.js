import "./globals.css";
import AppShell from "./AppShell";

export const metadata = {
  title: "DS Permitting CRM",
  description: "Leads and permit pipeline dashboard for DS Permitting Services",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
