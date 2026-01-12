'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getNeonAuthClient } from '@/lib/neonAuthClient';

export default function SupplierLanding() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await neonClient.getSession();
        if (session?.data?.user?.email) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Not authenticated
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/supplier/dashboard');
    } else {
      router.push('/login?redirect=/supplier/onboarding');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-(--background)">
        <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-(--background) overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-(--primary)/10 via-transparent to-(--accent)/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-(--primary)/5 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-(--accent)/5 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full text-center">
          {/* Logo/Brand */}
          <div className="mb-8 animate-fade-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-(--primary) via-(--accent) to-(--primary) bg-clip-text text-transparent animate-float">
              PLEXARIS
            </h1>
            <p className="text-xl sm:text-2xl text-(--text-secondary) font-light">
              Supplier Portal
            </p>
          </div>

          {/* Main Headline */}
          <div className="mb-12 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-(--text) leading-tight">
              Grow Your Business with
              <br />
              <span className="bg-gradient-to-r from-(--primary) to-(--accent) bg-clip-text text-transparent">
                AI-Powered Inventory
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-(--text-secondary) max-w-2xl mx-auto leading-relaxed">
              Manage products, track orders, and boost sales with our intelligent supplier platform.
              Everything you need in one place.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={handleGetStarted}
              className="group px-8 py-4 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-bold rounded-xl transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-105 text-lg tracking-[0.08em] uppercase min-w-[200px]"
            >
              Get Started
              <svg className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-(--bg-card)/80 backdrop-blur-xl border-2 border-(--border) hover:border-(--primary) text-(--text) font-semibold rounded-xl transition-all hover:bg-(--bg-card) text-lg tracking-[0.08em] uppercase min-w-[200px]"
            >
              Sign In
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {[
              { label: 'Active Suppliers', value: '500+' },
              { label: 'Products Managed', value: '10K+' },
              { label: 'Orders Processed', value: '50K+' },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-(--bg-card)/60 backdrop-blur-xl border border-(--border) rounded-2xl p-6 hover:border-(--primary)/50 hover:shadow-lg hover:shadow-(--primary)/10 transition-all"
              >
                <div className="text-3xl sm:text-4xl font-bold text-(--primary) mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-(--text-secondary) uppercase tracking-[0.08em]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-(--text)">
              Everything You Need to
              <span className="bg-gradient-to-r from-(--primary) to-(--accent) bg-clip-text text-transparent"> Succeed</span>
            </h2>
            <p className="text-lg text-(--text-secondary) max-w-2xl mx-auto">
              Powerful tools designed to help you manage your inventory and grow your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: '📦',
                title: 'Product Management',
                description: 'Easily add, edit, and organize your products with our intuitive interface. Bulk uploads and AI-powered categorization.',
              },
              {
                icon: '📊',
                title: 'Real-Time Analytics',
                description: 'Track sales, monitor inventory levels, and get insights into your best-performing products.',
              },
              {
                icon: '🤖',
                title: 'AI Assistant',
                description: 'Get instant help with product management, stock updates, and order tracking using natural language.',
              },
              {
                icon: '📱',
                title: 'Mobile Optimized',
                description: 'Manage your business on the go with our fully responsive design that works on any device.',
              },
              {
                icon: '⚡',
                title: 'Lightning Fast',
                description: 'Optimized for speed with instant updates, real-time sync, and minimal loading times.',
              },
              {
                icon: '🔒',
                title: 'Secure & Reliable',
                description: 'Enterprise-grade security with encrypted data, secure payments, and reliable infrastructure.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-(--bg-card)/60 backdrop-blur-xl border border-(--border) rounded-2xl p-6 sm:p-8 hover:border-(--primary)/50 hover:shadow-lg hover:shadow-(--primary)/10 transition-all group"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 text-(--text) uppercase tracking-[0.08em]">{feature.title}</h3>
                <p className="text-(--text-secondary) leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-(--primary)/20 via-(--accent)/20 to-(--primary)/20 backdrop-blur-xl border border-(--primary)/30 rounded-3xl p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-(--text)">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl text-(--text-secondary) mb-8 max-w-2xl mx-auto">
              Join hundreds of suppliers already using Plexaris to grow their business.
              Set up your account in minutes.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-5 bg-gradient-to-r from-(--primary) to-(--accent) hover:from-(--primary-light) hover:to-(--accent-light) text-white font-bold rounded-xl transition-all shadow-lg shadow-(--primary)/30 hover:shadow-(--primary)/50 hover:scale-105 text-lg sm:text-xl tracking-[0.08em] uppercase"
            >
              Start Free Today
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-(--border) py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-(--text-secondary) text-sm">
          <p>© {new Date().getFullYear()} Plexaris. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

