import type { ReactNode } from 'react';
import './globals.css';
import { GoogleTranslateScript } from '@/components/layout/GoogleTranslateScript';

/**
 * Root layout.
 *
 * Next.js App Router requires exactly one <html> and <body> in the tree.
 * The Laravel application has NO layout inheritance (blueprint §4.1): every
 * Blade view is a standalone document with its own <head>. To reproduce that
 * without violating the framework's structural requirement, this layout
 * renders the bare minimum and injects nothing that participates in CSS or
 * JS selectors (permitted under contract §7.2). Every page supplies its own
 * <head> via `metadata`/`generateMetadata` and its own full body content.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GoogleTranslateScript />
        {children}
      </body>
    </html>
  );
}
