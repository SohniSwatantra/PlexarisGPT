'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RoleSelectionPage() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const storedName = sessionStorage.getItem('userName') || '';
        const storedEmail = sessionStorage.getItem('userEmail') || '';
        if (storedEmail) {
          setEmail(storedEmail);
        } else {
        const { data: sessionData } = await neonClient.getSession();
        const user = sessionData?.user;
          if (user?.email) setEmail(user.email);
          if (user?.user_metadata?.name) setName(user.user_metadata.name);
        }
        if (storedName) setName(storedName);
      } catch (err) {
        setError('Could not load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [neonClient]);

  const normalizeName = (val) => {
    const trimmed = (val || '').trim();
    return trimmed || (email ? email.split('@')[0] : 'User');
  };

  const persistSession = (data, role) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('userId', data.user_id);
      sessionStorage.setItem('userEmail', data.email);
      sessionStorage.setItem('userName', data.name || name);
      sessionStorage.setItem('userRole', role);
      if (data.supplier_id) {
        sessionStorage.setItem('supplierId', data.supplier_id);
      } else {
        sessionStorage.removeItem('supplierId');
      }
    }
  };

  const handleSelect = async (role) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/sync-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: normalizeName(name),
          desired_role: role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || 'Failed to update role.');
        setLoading(false);
        return;
      }
      const finalRole = role || data.user_role || 'customer';
      persistSession(data, finalRole);
      if (finalRole === 'supplier') {
        if (data.supplier_id) {
          router.replace('/supplier/dashboard');
        } else {
          router.replace('/supplier/onboarding');
        }
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <p className="text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-(--background)">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-(--primary) mb-2 text-center">Choose your role</h1>
        <p className="text-(--text-secondary) text-center mb-6">
          Update your name and pick how you want to use Plexaris.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelect('customer')}
              disabled={loading}
              className="w-full border border-(--border) rounded-xl py-3 font-medium hover:bg-(--primary)/5 disabled:opacity-50"
            >
              Continue as Customer
            </button>
            <button
              type="button"
              onClick={() => handleSelect('supplier')}
              disabled={loading}
              className="w-full bg-(--primary) text-white rounded-xl py-3 font-medium hover:bg-(--primary-light) disabled:opacity-50"
            >
              Continue as Supplier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
