import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaInit from '@/components/pwa-init';

export const metadata: Metadata = {
  title: 'Asevin',
  description:
    'A private couple app ...',
  applicationName: 'Asevin',
  appleWebApp: {
    capable: true,
    title: 'Asevin',
    statusBarStyle: 'black-translucent',
  },
};
export const viewport: Viewport = {
  themeColor: '#09090b',
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}