import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <SiteHeader />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ maxWidth: 600, width: '100%', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: '48px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#047857', fontSize: 36, fontWeight: 700, marginBottom: 20 }}>
            404
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            The page or product you are looking for doesn't exist, may have been relocated, or is temporarily unavailable.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: '#047857',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(4,120,87,0.25)',
              }}
            >
              Back to Home
            </Link>
            <Link
              href="/homeopathy"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Homeopathy Store
            </Link>
            <Link
              href="/cosmetics"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Cosmetics
            </Link>
            <Link
              href="/herbs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Herbs Store
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
