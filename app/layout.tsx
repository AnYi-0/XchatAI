import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XchatAI',
  description: 'XchatAI UI scaffold based on a simplified Next.js homepage.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
