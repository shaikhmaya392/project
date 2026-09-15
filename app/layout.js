import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import AppShell from "./AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-poppins" });

export const metadata = {
  title: "DS Permitting CRM",
  description: "Leads and permit pipeline dashboard for DS Permitting Services",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
