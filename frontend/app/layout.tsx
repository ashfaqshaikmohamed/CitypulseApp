// FILE: frontend/app/layout.tsx
// ROLE: Sets up the root layout wrapper with Syne and DM Sans via Google Fonts and deep dark navy theme settings.

import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-syne',
});

export const metadata = {
  title: 'CityPulse | Civic Accountability Engine',
  description: 'Real-time 311 complaint data for NYC, Chicago, and San Francisco',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌇</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable} h-full scroll-smooth bg-[#040d1a]`}>
      <body className="h-full font-sans text-[#c8d4e8] antialiased">
        {children}
      </body>
    </html>
  );
}
