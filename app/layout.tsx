import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

// Bells of Steel set their whole site in Rubik. Self-hosted so there is no
// third-party request on load.
const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rana Thind · Bells of Steel Application Portfolio',
  description:
    'Five working tools built on the live Bells of Steel product catalogue, for the AI & Internal Tools Developer application.',
};

const NAV = [
  { href: '/builder', label: 'Gym Builder' },
  { href: '/audit', label: 'Catalogue Audit' },
  { href: '/monitor', label: 'Monitor' },
  { href: '/copilot', label: 'CS Copilot' },
  { href: '/spotter', label: 'Spotter' },
  { href: '/build-log', label: 'Build Log' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={rubik.variable}>
      <body className="min-h-screen bg-ink font-sans text-bright antialiased">
        <header className="sticky top-0 z-50 border-b border-line bg-[#f5faff]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-2.5">
            <Link href="/" className="mr-auto shrink-0 text-[15px] font-extrabold tracking-[-0.01em] text-bright">
              Rana Thind<span className="text-steelDim"> × Bells of Steel</span>
            </Link>
            <nav className="flex items-center gap-5 overflow-x-auto">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap text-[13px] font-semibold text-dim transition-colors hover:text-steelDim"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-line bg-panel">
          <div className="mx-auto max-w-[1280px] px-6 py-10 text-[13px] leading-relaxed text-muted">
            <p className="max-w-3xl">
              <span className="font-bold text-bright">Job application portfolio.</span> Built by Rana Thind
              for the AI &amp; Internal Tools Developer application at Bells of Steel. This is an independent
              demonstration and is{' '}
              <span className="font-semibold text-bright">not affiliated with, endorsed by, or an official property of</span>{' '}
              Bells of Steel Inc.
            </p>
            <p className="mt-3 max-w-3xl">
              Product data is a read-only snapshot of the public Bells of Steel storefront catalogue
              (<code className="font-mono text-[12px] text-bright">bellsofsteel.com/products.json</code>), taken
              25 August 2026. Prices and availability were accurate at snapshot time only. Check the live
              store before relying on any number here. All product names, images and copy belong to Bells of
              Steel Inc. Typeface and colour palette are matched to the Bells of Steel storefront as a design exercise.
            </p>
            <p className="mt-4 font-semibold">
              <a href="mailto:ranasunj@ualberta.ca" className="text-dim hover:text-steelDim">ranasunj@ualberta.ca</a>
              <span className="px-2 text-line">·</span>
              <a href="https://github.com/sunjogthind/bells_of_steel_application" target="_blank" rel="noopener noreferrer"
                 className="text-dim hover:text-steelDim">
                source on GitHub
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
