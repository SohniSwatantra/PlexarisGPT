'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="min-h-dvh bg-(--background) flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-(--primary) mb-2">Order Placed Successfully!</h1>
        <p className="text-(--text-secondary) mb-8">
          Thank you for your order. Your order has been confirmed and is being processed.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-(--primary) hover:bg-(--primary-light) text-white font-medium py-3 rounded-xl transition-colors"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => router.push('/orders')}
            className="w-full border-2 border-(--border) hover:border-(--primary) text-(--primary) font-medium py-3 rounded-xl transition-colors"
          >
            View Order History
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
