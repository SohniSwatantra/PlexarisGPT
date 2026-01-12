'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!customerId.trim()) {
      setError(t('pleaseEnterCustomerId'));
      return;
    }

    // Persist simple customer auth
    localStorage.setItem('userId', customerId.trim());
    localStorage.setItem('userRole', 'customer');
    sessionStorage.setItem('userId', customerId.trim());
    sessionStorage.setItem('userRole', 'customer');

    router.push('/customer/shop');
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-(--bg)">
      <div className="w-full max-w-md bg-(--panel) border border-(--border) rounded-2xl shadow-xl shadow-(--primary)/10 p-8">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.14em] uppercase text-(--text-secondary)">{t('plexaris')} {t('customerPortal')}</p>
          <h1 className="text-3xl font-semibold text-(--text) mt-2">{t('signIn')}</h1>
          <p className="text-(--text-secondary) mt-2">{t('enterCustomerId')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-2">{t('customerId')}</label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. cust_123"
              className="w-full px-4 py-3 rounded-xl border border-(--border) bg-(--surface) text-(--text) focus:outline-none focus:ring-2 focus:ring-(--primary)/20"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-semibold py-3 rounded-xl shadow-lg shadow-(--primary)/20 transition"
          >
            {t('continue')}
          </button>
        </form>
      </div>
    </div>
  );
}
