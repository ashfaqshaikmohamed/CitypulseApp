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

export const metadata: Metadata = {
  title: 'CityPulse | Civic Accountability Engine',
  description: 'Track municipal response times, visualize complaint clusters, and hold local councils accountable.',
};

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
