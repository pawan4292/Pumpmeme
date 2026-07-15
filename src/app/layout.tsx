import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'PumpMeme — Memecoin Launchpad on Unicity',
  description: 'Create, pump, and trade memecoins on the Unicity Sphere testnet. Real bonding curves, autonomous graduation agent, zero-trust trading.',
  keywords: ['memecoin', 'Unicity', 'Sphere', 'DeFi', 'bonding curve', 'launchpad', 'crypto'],
  openGraph: {
    title: 'PumpMeme — Memecoin Launchpad on Unicity',
    description: 'Create, pump, and trade memecoins on the Unicity Sphere testnet.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PumpMeme — Memecoin Launchpad on Unicity',
    description: 'Create, pump, and trade memecoins on the Unicity Sphere testnet.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
