'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { Suspense } from 'react';
import ProfileEditor from '@/app/components/ProfileEditor';

export default function CustomerSettings() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
          <p className="mt-4 text-(--text-secondary)">Loading settings…</p>
        </div>
      </div>
    }>
      <CustomerSettingsContent />
    </Suspense>
  );
}

function CustomerSettingsContent() {
  const router = useRouter();
  const { user, userType, internalUserId, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [userInfo, setUserInfo] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Check authentication
  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated || !internalUserId || userType !== 'customer') {
      router.replace('/');
      return;
    }

    // Load user info for profile editor
    const loadUserInfo = async () => {
      try {
        const res = await fetch(`/api/users/${internalUserId}`);
        if (res.ok) {
          const userData = await res.json();
          const actualData = userData.user || userData;
          setUserInfo(actualData);
        }
      } catch (err) {
        // Error loading user info - continue without it
      }
    };

    loadUserInfo();
  }, [router, authLoading, isAuthenticated, userType, internalUserId]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg)">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-(--primary)" />
          <p className="mt-4 text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) text-(--text)">
      <nav className="bg-(--panel) backdrop-blur-xl border-b border-(--border)">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs tracking-[0.14em] uppercase text-(--text-secondary)">{t('plexaris')}</p>
              <h1 className="text-2xl font-semibold tracking-[0.08em]">{t('settings')}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/customer/shop')}
              className="px-4 py-2 bg-(--bg-secondary) border border-(--border) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) rounded-lg transition-all font-semibold text-sm"
            >
              {t('browseSuppliers')}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gradient-to-r from-(--primary) to-(--accent) text-white rounded-lg font-semibold transition-all shadow-lg shadow-(--primary)/20"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/10 p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-6">{t('businessProfile') || 'Business Profile'}</h2>
          <ProfileEditor 
            userInfo={userInfo} 
            internalUserId={internalUserId}
            onSuccess={() => {
              setSuccessMessage('Profile updated successfully!');
              setTimeout(() => setSuccessMessage(''), 5000);
            }}
          />
        </div>

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-400/50 text-emerald-100 rounded-lg p-4 mb-6 animate-in fade-in">
            {successMessage}
          </div>
        )}

        <div className="bg-(--bg-secondary)/80 backdrop-blur-xl rounded-2xl border border-(--border) shadow-lg shadow-(--primary)/10 p-6">
          <h2 className="text-2xl font-semibold mb-6">{t('language')}</h2>
          
          <div className="flex gap-4">
            <button
              onClick={() => setLocale('en')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all border ${
                locale === 'en'
                  ? 'bg-gradient-to-r from-(--primary) to-(--accent) text-white border-(--primary) shadow-lg shadow-(--primary)/20'
                  : 'bg-(--surface) text-(--text-secondary) border-(--border) hover:border-(--primary) hover:text-(--primary)'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale('nl')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all border ${
                locale === 'nl'
                  ? 'bg-gradient-to-r from-(--primary) to-(--accent) text-white border-(--primary) shadow-lg shadow-(--primary)/20'
                  : 'bg-(--surface) text-(--text-secondary) border-(--border) hover:border-(--primary) hover:text-(--primary)'
              }`}
            >
              Nederlands
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
