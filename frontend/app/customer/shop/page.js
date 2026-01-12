'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyShopRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customer/chat');
  }, [router]);
  return null;
}
