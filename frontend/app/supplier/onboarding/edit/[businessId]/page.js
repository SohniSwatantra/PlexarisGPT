'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditBusinessPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const neonClient = getNeonAuthClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* -------------------------------------------------------
     AUTH + ONBOARDING GUARD
  ------------------------------------------------------- */
  useEffect(() => {
    const init = async () => {
      const session = await neonClient.getSession();
      const email = session?.data?.user?.email;

      if (!email) {
        router.replace('/login');
        return;
      }

      const statusRes = await fetch(
        `${API_URL}/api/suppliers/onboarding-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      );

      if (!statusRes.ok) {
        router.replace('/login');
        return;
      }

      const status = await statusRes.json();

      if (status.onboarding_step === 'claim_pending') {
        router.replace('/supplier/onboarding/claim-pending');
        return;
      }

      if (status.onboarding_completed === true) {
        router.replace('/supplier/dashboard');
        return;
      }

      if (
        status.claimed_business_id &&
        status.claimed_business_id !== businessId
      ) {
        router.replace('/supplier/onboarding/claim-pending');
        return;
      }

      const businessRes = await fetch(
        `${API_URL}/api/businesses/${businessId}`
      );

      if (!businessRes.ok) {
        setError('Failed to load business profile');
        setLoading(false);
        return;
      }

      const data = await businessRes.json();

      setBusiness({
        ...data,
        contact_info: data.contact_info || {},
        social_links: data.social_links || {},
      });

      setLoading(false);
    };

    init();
  }, [businessId, router]);

  /* -------------------------------------------------------
     SAVE HANDLER
  ------------------------------------------------------- */
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await fetch(`${API_URL}/api/businesses/${businessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(business),
      });

      await fetch(
        `${API_URL}/api/suppliers/${business.owner_supplier_id}/complete-onboarding`,
        { method: 'PATCH' }
      );

      setSuccess('Business profile updated successfully');

      setTimeout(() => {
        router.replace('/supplier/dashboard');
      }, 800);
    } catch {
      setError('Failed to save business profile');
    } finally {
      setSaving(false);
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
    <main className="min-h-dvh bg-(--background)">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-(--text)">
            Edit Business Profile
          </h1>
          <p className="text-sm text-(--text-secondary)">
            Review and complete your business information
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/30 p-4 text-green-300">
            {success}
          </div>
        )}

        {/* Card */}
        <div className="bg-(--bg-card)/80 backdrop-blur-xl border border-(--border) rounded-2xl p-6 shadow-lg shadow-(--primary)/5">
          <h2 className="text-lg font-semibold text-(--text) mb-6">
            Company Details
          </h2>

          <div className="space-y-6">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-(--text)">
                Business Name
              </label>
              <input
                value={business.name || ''}
                disabled
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border) text-(--text) opacity-70"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium mb-2 text-(--text)">
                Address
              </label>
              <input
                value={business.address || ''}
                onChange={(e) =>
                  setBusiness({ ...business, address: e.target.value })
                }
                placeholder="Enter business address"
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)
                           focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-(--text)">
                Contact Information
              </h3>

              <input
                placeholder="Phone"
                value={business.contact_info.phone || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    contact_info: {
                      ...business.contact_info,
                      phone: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />

              <input
                type="email"
                placeholder="Email"
                value={business.contact_info.email || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    contact_info: {
                      ...business.contact_info,
                      email: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />

              <input
                placeholder="WhatsApp"
                value={business.contact_info.whatsapp || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    contact_info: {
                      ...business.contact_info,
                      whatsapp: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-(--text)">
                Social Links
              </h3>

              <input
                placeholder="Website"
                value={business.social_links.website || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    social_links: {
                      ...business.social_links,
                      website: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />

              <input
                placeholder="Instagram"
                value={business.social_links.instagram || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    social_links: {
                      ...business.social_links,
                      instagram: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />

              <input
                placeholder="Facebook"
                value={business.social_links.facebook || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    social_links: {
                      ...business.social_links,
                      facebook: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />

              <input
                placeholder="LinkedIn"
                value={business.social_links.linkedin || ''}
                onChange={(e) =>
                  setBusiness({
                    ...business,
                    social_links: {
                      ...business.social_links,
                      linkedin: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-3 rounded-xl bg-(--bg-secondary)/50 border border-(--border)"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-(--primary) to-(--accent)
                         transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
