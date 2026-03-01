import type { Metadata } from 'next';
import './globals.css';
import PwaInit from '@/components/pwa-init';

export const metadata: Metadata = {
  title: 'Us',
  description: 'Private couple app',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Us',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}