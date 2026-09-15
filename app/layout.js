export const metadata = {
  title: "Project",
  description: "Deployed on Vercel",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
