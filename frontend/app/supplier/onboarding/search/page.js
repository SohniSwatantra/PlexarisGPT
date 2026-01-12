'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SupplierOnboarding() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
//   const [userEmail, setUserEmail] = useState(null);

  /* -------------------------------------------------------
     AUTH GUARD (same behavior as dashboard)
  ------------------------------------------------------- */
  useEffect(() => {
    const checkAuth = async () => {
      const session = await neonClient.getSession();
      if (!session?.data?.user?.email) {
        router.replace('/login');
        return;
      }
    //   setUserEmail(session.data.user.email);
      const res = await fetch(`${API_URL}/api/suppliers/onboarding-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: session.data.user.email
        })
        });

        if (res.ok) {
        const data = await res.json();
        
        if (data.onboarding_step === 'completed') {
        router.replace('/supplier/dashboard');
        return;
        }

        if (data.onboarding_step === 'claim_pending') {
        router.replace('/supplier/onboarding/claim-pending');
        return;
        }

        if (data.onboarding_step === 'edit_profile') {
        router.replace(`/supplier/onboarding/edit/${data.business_id}`);
        return;
        }

        }

        setLoading(false);

    };

    checkAuth();
  }, [router]);

  /* -------------------------------------------------------
     SEARCH HANDLER
  ------------------------------------------------------- */
  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResults([]);

    if (!query.trim()) return;

    try {
      const res = await fetch(
    `${API_URL}/api/businesses/search?q=${encodeURIComponent(query)}`
    );


      if (!res.ok) {
        setError('Failed to search businesses');
        return;
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      setError('An error occurred while searching');
    }
  };

  /* -------------------------------------------------------
     CLAIM HANDLER
  ------------------------------------------------------- */
  const handleClaim = async (businessId) => {
    setClaimingId(businessId);
    setError('');
    setSuccess('');

    try {
        const session = await neonClient.getSession();
        const email = session?.data?.user?.email;

        if (!email) {
        setError('Not authenticated');
        return;
        }

        const supplierRes = await fetch(
        `${API_URL}/api/suppliers/check-email/${encodeURIComponent(email)}`
        );

        if (!supplierRes.ok) {
        setError('Supplier not found');
        return;
        }

        const supplierData = await supplierRes.json();

        if (!supplierData.exists || !supplierData.supplier_id) {
        setError('Supplier account missing');
        return;
        }

        const supplierId = supplierData.supplier_id;

        const res = await fetch(
        `${API_URL}/api/businesses/${businessId}/claim?supplier_id=${supplierId}`,
        { method: 'POST' }
        );

        if (!res.ok) {
        const err = await res.json();
        setError(err.detail || 'Failed to claim business');
        return;
        }

        // function for auto approve claiming business, command or delete to remove auto approve
        const res2 = await fetch(
        `${API_URL}/api/businesses/${businessId}/approve?supplier_id=${supplierId}`,
        { method: 'POST' }
        );
        
        if (!res2.ok ) {
        const err = await res.json();
        setError(err.detail || 'Failed to approve business');
        return;
        }

        setSuccess('Claim submitted. Awaiting approval...');
        setTimeout(() => router.replace('/supplier/onboarding/claim-pending'), 800);
    } catch (e) {
        setError('An error occurred while claiming');
    } finally {
        setClaimingId(null);
    }
    };



  /* -------------------------------------------------------
     LOADING STATE
  ------------------------------------------------------- */
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-(--text-secondary)">Loading...</p>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="mb-6">
        <h1 className="text-2xl font-bold text-(--text)">
            Supplier Onboarding
        </h1>
        <p className="text-sm text-(--text-secondary)">
            Search and claim your business profile
        </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl p-4 mb-4">
            {success}
          </div>
        )}

        {/* Search Card */}
        <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-6 shadow-lg shadow-(--primary)/5 mb-6">
          <h2 className="text-lg font-semibold mb-2">
            Find your business
          </h2>
          <p className="text-sm text-(--text-secondary) mb-4">
            Search for your scraped business profile and claim ownership.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Two Wine"
              className="flex-1 px-4 py-3 bg-(--bg-secondary)/50 border border-(--border) rounded-xl focus:outline-none focus:ring-2 focus:ring-(--primary) text-(--text)"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-(--primary) to-(--accent) text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {results.length === 0 && (
            <div className="text-center text-(--text-secondary) py-12">
              No results yet. Try searching your business name.
            </div>
          )}

          {results.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-6 flex items-center justify-between hover:border-(--primary)/40 transition-all"
            >
              <div>
                <h3 className="text-lg font-semibold">
                  {supplier.name}
                </h3>
                <p className="text-sm text-(--text-secondary)">
                  {supplier.address || 'No address available'}
                </p>
                <p className="text-xs mt-1 text-(--text-secondary)">
                  Status: {supplier.status}
                </p>
              </div>

              {supplier.status === 'unclaimed' && !success && (
                <button
                  onClick={() => handleClaim(supplier.id)}
                  disabled={claimingId === supplier.id}
                  className="px-5 py-2 bg-(--primary) hover:bg-(--primary-light) text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {claimingId === supplier.id ? 'Claiming...' : 'Claim'}
                </button>
              )}
            </div>
          ))}
        </div>
      </main>
  );
}
