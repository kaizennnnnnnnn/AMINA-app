import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaInit from '@/components/pwa-init';

export const metadata: Metadata = {
  title: 'Us',
  description:
    'A private couple app for notes, moments, voice messages, and playful connection.',
  applicationName: 'Us',
  appleWebApp: {
    capable: true,
    title: 'Us',
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
      <body>
        <PwaInit />
        {children}
      </body>
    </html>
  );
}