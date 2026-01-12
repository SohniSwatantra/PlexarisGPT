'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#faf9f7' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(250, 249, 247, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e5e3e0' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="text-[18px] font-semibold" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>Plexaris</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-colors"
              style={{ color: '#6b6b6b' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f5f4f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-[14px] font-medium rounded-lg transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: '#f5f4f2', border: '1px solid #e5e3e0' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
            <span className="text-[13px] font-medium" style={{ color: '#6b6b6b' }}>AI-powered ordering for hospitality</span>
          </div>

          <h1 className="text-[48px] sm:text-[56px] md:text-[64px] font-semibold leading-[1.1] mb-6" style={{ color: '#1a1a1a', letterSpacing: '-0.03em' }}>
            The intelligent way to
            <br />
            <span style={{ color: '#6b6b6b' }}>manage your supplies</span>
          </h1>

          <p className="text-[18px] leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: '#6b6b6b' }}>
            Order ingredients, track inventory, and manage suppliers — all through natural conversation.
            Built for restaurants, hotels, and catering businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 text-[15px] font-medium rounded-lg transition-all"
              style={{ background: '#1a1a1a', color: '#ffffff' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
            >
              Start free today
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 text-[15px] font-medium rounded-lg transition-all"
              style={{ background: '#ffffff', border: '1px solid #e5e3e0', color: '#1a1a1a' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f4f2';
                e.currentTarget.style.borderColor = '#999999';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e3e0';
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6" style={{ background: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[36px] font-semibold mb-4" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>How it works</h2>
            <p className="text-[16px]" style={{ color: '#6b6b6b' }}>Get started in minutes, not weeks</p>
          </div>

          <div className="space-y-8">
            {[
              { num: '01', title: 'Connect your suppliers', desc: 'Link all your regular suppliers to the platform. Our system learns your preferences and past orders.' },
              { num: '02', title: 'Chat naturally', desc: 'Use natural language to ask for products, prices, and availability. The AI handles supplier communication.' },
              { num: '03', title: 'Order intelligently', desc: 'Get recommendations based on your history, current inventory, and needs. Place orders with one click.' },
              { num: '04', title: 'Track everything', desc: 'Monitor deliveries, spending, and inventory levels. Get insights to optimize your supply chain.' }
            ].map((step) => (
              <div key={step.num} className="flex gap-6 items-start p-6 rounded-xl transition-all" style={{ background: '#faf9f7' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1a1a1a' }}>
                  <span className="text-white text-[14px] font-semibold">{step.num}</span>
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold mb-2" style={{ color: '#1a1a1a' }}>{step.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: '#6b6b6b' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[36px] font-semibold mb-4" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>Why choose Plexaris</h2>
            <p className="text-[16px]" style={{ color: '#6b6b6b' }}>Everything you need to streamline your supply chain</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: '💬', title: 'AI Chat', desc: 'Talk to suppliers naturally. Our AI understands your needs.' },
              { icon: '⚡', title: 'Instant Orders', desc: 'Place orders in seconds. No more tedious form filling.' },
              { icon: '📊', title: 'Analytics', desc: 'Track spending, trends, and supplier performance.' },
              { icon: '⏱️', title: 'Save Time', desc: 'Reduce ordering time by 80%. Focus on what matters.' }
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl transition-all"
                style={{ background: '#ffffff', border: '1px solid #e5e3e0' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#999999'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e3e0'}
              >
                <div className="text-2xl mb-3">{feature.icon}</div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#1a1a1a' }}>{feature.title}</h3>
                <p className="text-[14px]" style={{ color: '#6b6b6b' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Horeca */}
      <section className="py-20 px-6" style={{ background: '#ffffff' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[36px] font-semibold mb-4" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>Built for hospitality</h2>
            <p className="text-[16px]" style={{ color: '#6b6b6b' }}>Designed specifically for restaurants, hotels, and catering</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl" style={{ background: '#faf9f7' }}>
              <h3 className="text-[20px] font-semibold mb-4" style={{ color: '#1a1a1a' }}>Restaurants</h3>
              <ul className="space-y-3">
                {['Order ingredients from multiple suppliers', 'Track food costs and inventory', 'Get alerts for low stock items', 'Compare prices across suppliers'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: '#6b6b6b' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#1a1a1a' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 rounded-xl" style={{ background: '#faf9f7' }}>
              <h3 className="text-[20px] font-semibold mb-4" style={{ color: '#1a1a1a' }}>Hotels & Catering</h3>
              <ul className="space-y-3">
                {['Manage bulk orders efficiently', 'Handle multiple departments easily', 'Automated reordering for essentials', 'Centralized supplier management'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: '#6b6b6b' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#1a1a1a' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[32px] font-semibold mb-4" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>
            Ready to transform your supply chain?
          </h2>
          <p className="text-[16px] mb-8" style={{ color: '#6b6b6b' }}>
            Join restaurants, hotels, and catering businesses already using Plexaris
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 text-[15px] font-medium rounded-lg transition-all"
            style={{ background: '#1a1a1a', color: '#ffffff' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
          >
            Start free today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid #e5e3e0' }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[14px]" style={{ color: '#999999' }}>
            © 2026 Plexaris. Intelligent ordering for modern restaurants and hotels.
          </p>
        </div>
      </footer>
    </div>
  );
}
