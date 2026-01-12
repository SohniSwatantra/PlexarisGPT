'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

export default function SupplierCompanyOnboarding() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [userEmail, setUserEmail] = useState('');
  const [contactName, setContactName] = useState('');

  // Company form
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const session = await neonClient.getSession();
      if (!session) {
        router.replace('/login');
      }
    };
    checkSession();
  }, []);

  /* ------------------------------------
   * Auth & existing supplier check
   * ---------------------------------- */
  useEffect(() => {
    const init = async () => {
      try {
        const session = await neonClient.getSession();

        if (!session?.data?.user?.email) {
          router.push('/login');
          return;
        }

        const email = session.data.user.email;
        setUserEmail(email);
        setContactName(session.data.user.name || '');

        // Check if supplier already exists
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/check-email/${encodeURIComponent(email)}`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.onboarding_completed) {
            router.push('/supplier/dashboard');
            return;
          }
        }

        setCheckingAuth(false);
      } catch (err) {
        console.error('Auth error:', err);
        router.push('/login');
      }
    };

    init();
  }, [router]);

  /* ------------------------------------
   * Submit company data
   * ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyName.trim() || !websiteUrl.trim()) {
      setError('Company name and website are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: companyName.trim(),
            business_name: companyName.trim(),
            website_url: websiteUrl.trim(),
            address: address.trim() || null,
            phone: phone.trim() || null,
            primary_category: primaryCategory || null,
            email: userEmail,
            auth_provider: 'email_password',
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create supplier');
      }

      const data = await response.json();

      // Redirect to next onboarding step
        router.push('/supplier/onboarding/search');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------
   * Loading state
   * ---------------------------------- */
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ------------------------------------
   * UI
   * ---------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Company Details
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Website URL *</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Primary Category</label>
            <select
              value={primaryCategory}
              onChange={(e) => setPrimaryCategory(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category</option>
              <option value="bakery">Bakery</option>
              <option value="beverages">Beverages</option>
              <option value="dairy">Dairy</option>
              <option value="meat">Meat & Poultry</option>
              <option value="produce">Produce</option>
              <option value="snacks">Snacks</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
