import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Rana Thind — Bells of Steel Application Portfolio',
  description:
    'Four working internal tools built on the live Bells of Steel product catalog, for the AI & Internal Tools Developer application.',
};

const NAV = [
  { href: '/builder', label: 'Gym Builder' },
  { href: '/audit', label: 'Catalog Audit' },
  { href: '/parts', label: 'Parts Finder' },
  { href: '/copilot', label: 'CS Copilot' },
  { href: '/build-log', label: 'Build Log' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-50 border-b border-line bg-ink/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
            <Link href="/" className="group flex items-center gap-2.5 shrink-0">
              <span className="grid h-7 w-7 place-items-center rounded bg-steel font-mono text-xs font-bold text-ink">
                RT
              </span>
              <span className="text-sm font-medium tracking-tight group-hover:text-steel transition-colors">
                Rana Thind
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-1 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded px-2.5 py-1.5 text-muted transition-colors hover:bg-panel hover:text-bright"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-10 text-xs leading-relaxed text-muted">
            <p className="max-w-3xl">
              <span className="text-bright">Job application portfolio.</span> Built by Rana Thind for the
              AI &amp; Internal Tools Developer application at Bells of Steel. This is an independent
              demonstration and is <span className="text-bright">not affiliated with, endorsed by, or an official property of</span>{' '}
              Bells of Steel Inc.
            </p>
            <p className="mt-3 max-w-3xl">
              Product data is a read-only snapshot of the public Bells of Steel storefront catalog
              (<code className="text-bright">bellsofsteel.com/products.json</code>), taken 25 August 2026.
              Prices and availability were accurate at snapshot time only — check the live store before
              relying on any number here. All product names, images and copy belong to Bells of Steel Inc.
            </p>
            <p className="mt-4 font-mono">
              <a href="mailto:ranasunj@ualberta.ca" className="hover:text-bright">ranasunj@ualberta.ca</a>
              {' · '}
              <a href="https://github.com/sunjogthind/bells_of_steel_application" target="_blank" rel="noopener noreferrer" className="hover:text-bright">
                source on GitHub
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
