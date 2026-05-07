import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
});

export const metadata: Metadata = {
  title: "Urban Cashflow",
  description: "Invoice & payment cashflow management",
};

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/suppliers", label: "Suppliers" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="ltr" className={`${rubik.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-8 sticky top-0 z-10">
          <span className="font-bold text-blue-700 text-lg tracking-tight">Urban Cashflow</span>
          <div className="flex gap-6">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-slate-600 hover:text-blue-700 font-medium transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
      </body>
    </html>
  );
}
