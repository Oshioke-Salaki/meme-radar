'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Check } from 'lucide-react';
import TokenDetail from '@/components/tokens/TokenDetail';
import AlertModal from '@/components/ui/AlertModal';
import ToastContainer from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { Token } from '@/lib/types';

interface Props { token: Token; }

export default function TokenPageClient({ token }: Props) {
  const [alertToken, setAlertToken] = useState<Token | null>(null);
  const { toasts, push, remove } = useToast();
  const [copied, setCopied] = useState(false);

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `$${token.ticker} — Signal ${token.signal}`, url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Mini nav */}
      <div className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(7,7,15,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="btn btn-ghost text-xs flex items-center gap-1.5">
          <ArrowLeft size={13} /> Back to Radar
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm" style={{ color: token.color }}>
            ${token.ticker}
          </span>
          <span className="font-mono text-sm px-2 py-0.5 rounded"
            style={{ background: `${token.color}15`, color: token.color, border: `1px solid ${token.color}30` }}>
            Signal {token.signal}
          </span>
        </div>
        <button onClick={share} className="btn btn-ghost text-xs flex items-center gap-1.5">
          {copied ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
        </button>
      </div>

      <main className="max-w-md mx-auto px-4 py-6">
        <TokenDetail
          token={token}
          onClose={() => window.history.back()}
          onAlert={() => setAlertToken(token)}
        />
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          Powered by{' '}
          <Link href="/" style={{ color: 'var(--green)' }}>MemeRadar</Link>
          {' '}· Real-time AI signal scanner for BNB Chain
        </p>
      </main>

      {alertToken && (
        <AlertModal
          token={alertToken}
          onClose={() => setAlertToken(null)}
          onSaved={() => push({ type: 'success', title: `Alert set for $${alertToken?.ticker}`, body: 'You will be notified when the threshold is crossed.' })}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </div>
  );
}
