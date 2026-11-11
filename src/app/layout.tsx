import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scrabble — Play Solo or Worldwide',
  description: 'Classic Scrabble game with single-player AI and worldwide online multiplayer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

