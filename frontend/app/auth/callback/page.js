'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function NeonAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Finalizing sign-in...');

  useEffect(() => {
    const finalize = async () => {
      try {
        const client = getNeonAuthClient();
        const { data: session, error: sessionError } = await client.getSession();
        if (sessionError || !session || !session.user) {
          setError('No session found. Please try again.');
          return;
        }
        const user = session.user;
        const email = user?.email;
        const name =
          user?.user_metadata?.name ||
          user?.email?.split('@')[0] ||
          'New User';
        if (!email) {
          setError('No email returned from Neon Auth. Please use an account with a verified email.');
          return;
        }

        const roleChoice = sessionStorage.getItem('pendingRole'); // optional

        // Sync with backend to upsert and infer role/supplier
        const res = await fetch(`${API_URL}/api/auth/sync-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            desired_role: roleChoice || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.detail || 'Failed to sync user.');
          return;
        }

        // Persist session info for guards and role screen
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('userId', data.user_id);
          sessionStorage.setItem('userEmail', data.email);
          sessionStorage.setItem('userName', data.name || name);
          sessionStorage.setItem('userRole', data.user_role || 'customer');
          if (data.supplier_id) {
            sessionStorage.setItem('supplierId', data.supplier_id);
          } else {
            sessionStorage.removeItem('supplierId');
          }
        }

        setStatus('Redirecting...');
        if (data.user_role === 'supplier') {
          if (data.supplier_id) {
            router.replace('/supplier/dashboard');
          } else {
            router.replace('/supplier/onboarding');
          }
        } else {
          // If no supplier link and no explicit role choice, show role picker
          if (!roleChoice) {
            router.replace('/auth/role');
          } else {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        setError('Sign-in failed. Please try again.');
      }
    };

    finalize();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-(--background)">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-red-600 mb-3">Authentication Error</h1>
            <p className="text-(--text-secondary)">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-(--primary) mb-3">Finishing up…</h1>
            <p className="text-(--text-secondary)">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}
