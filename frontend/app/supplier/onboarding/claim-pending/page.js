'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export default function ClaimPendingPage() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();
  useEffect(() => {
    const guard = async () => {
      const session = await neonClient.getSession();

        const res = await fetch(`${API_URL}/api/suppliers/onboarding-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: session.data.user.email
        })
        });


      if (!res.ok) {
        router.replace('/login');
        return;
      }

      const data = await res.json();

      // ✅ approved → edit business
      if (data.onboarding_step === 'edit_profile') {
        router.replace(
          `/supplier/onboarding/edit/${data.business_id}`
        );
        return;
      }

      // ❌ no claim → back to supplier search
      if (data.onboarding_step === 'search_business') {
        router.replace('/supplier/onboarding/search');
        return;
      }

      // claim_pending → stay here
    };

    guard();
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">
          Claim submitted
        </h1>
        <p className="text-(--text-secondary)">
          Your business claim is under review.
          You’ll be notified once it’s approved.
        </p>
      </div>
    </div>
  );
}
