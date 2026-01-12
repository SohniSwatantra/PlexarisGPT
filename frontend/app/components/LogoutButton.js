'use client';

import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

export default function LogoutButton() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const handleLogout = async () => {
    try {
      await neonClient.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors border border-red-600/30"
    >
      Logout
    </button>
  );
}
