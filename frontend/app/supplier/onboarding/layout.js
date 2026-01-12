'use client';

import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

export default function SupplierLayout({ children }) {
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const handleLogout = async () => {
    try {
      await neonClient.signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-dvh bg-(--background) flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="bg-(--bg-card) border-b border-(--border) flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <img
                src="/logo.svg"
                alt="Plexaris"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-(--text)">
                  Supplier Portal
                </h1>
                <p className="text-sm text-(--text-secondary)">
                  Manage your business
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors border border-red-600/30"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
