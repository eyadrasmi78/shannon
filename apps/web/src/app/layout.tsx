import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Plus, LayoutDashboard } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shannon — Security Dashboard',
  description: 'AI-powered penetration testing dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface">
        <nav className="border-b border-border-default bg-surface-raised">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <Shield className="h-5 w-5 text-accent" />
              Shannon
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/scan/new"
                className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Scan
              </Link>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
