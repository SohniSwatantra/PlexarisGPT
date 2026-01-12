
'use client';
import '@/lib/cryptoPolyfill';
import { createAuthClient } from '@neondatabase/auth';

let neonClient;

export function getNeonAuthClient() {
  if (!neonClient) {
    const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;
    
    if (!authUrl) {
      throw new Error('NEXT_PUBLIC_NEON_AUTH_URL environment variable is not set');
    }
    
    // Create the auth client with explicit URL
    neonClient = createAuthClient(authUrl, {
      fetchOptions: {
        cache: 'no-store',
      },
    });
    Object.freeze(neonClient);
  }
  return neonClient;
}
