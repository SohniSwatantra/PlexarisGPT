'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-grid" style={{ background: '#141414' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #333333' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F5C042' }}>
              <span className="text-[#1a1a1a] text-sm font-bold">P</span>
            </div>
            <span className="text-[18px] font-semibold" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Plexaris</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-[14px] font-medium rounded-full transition-colors"
              style={{ color: '#b8b8b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f5f0e1'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#b8b8b8'}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-[14px] font-semibold rounded-full transition-all uppercase tracking-wide"
              style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFD060';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(245, 192, 66, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5C042';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-36 pb-24 px-6 bg-grid" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: '#1e1e1e', border: '1px solid #333333' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
            <span className="text-[13px] font-medium" style={{ color: '#b8b8b8' }}>AI-powered ordering for hospitality</span>
          </div>

          <h1 className="text-[48px] sm:text-[56px] md:text-[72px] font-bold leading-[1.05] mb-6" style={{ color: '#f5f0e1', letterSpacing: '-0.03em', fontFamily: 'var(--font-space-grotesk)' }}>
            THE INTELLIGENT WAY TO
            <br />
            <span style={{ color: '#F5C042' }}>MANAGE SUPPLIES</span>
          </h1>

          <p className="text-[18px] leading-relaxed mb-12 max-w-2xl mx-auto" style={{ color: '#b8b8b8' }}>
            Order ingredients, track inventory, and manage suppliers — all through natural conversation.
            Built for restaurants, hotels, and catering businesses.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
              style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFD060';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 192, 66, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5C042';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start Free Today
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide"
              style={{ background: 'transparent', border: '1px solid #333333', color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e1e1e';
                e.currentTarget.style.borderColor = '#F5C042';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#333333';
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6" style={{ background: '#1a1a1a' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4 uppercase" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>How It Works</h2>
            <p className="text-[16px]" style={{ color: '#777777' }}>Get started in minutes, not weeks</p>
          </div>

          <div className="space-y-6">
            {[
              { num: '01', title: 'Connect your suppliers', desc: 'Link all your regular suppliers to the platform. Our system learns your preferences and past orders.', color: '#4ADE80' },
              { num: '02', title: 'Chat naturally', desc: 'Use natural language to ask for products, prices, and availability. The AI handles supplier communication.', color: '#F5C042' },
              { num: '03', title: 'Order intelligently', desc: 'Get recommendations based on your history, current inventory, and needs. Place orders with one click.', color: '#F5A5B8' },
              { num: '04', title: 'Track everything', desc: 'Monitor deliveries, spending, and inventory levels. Get insights to optimize your supply chain.', color: '#60A5FA' }
            ].map((step) => (
              <div key={step.num} className="flex gap-6 items-start p-6 rounded-xl transition-all" style={{ background: '#1e1e1e', border: '1px solid #333333', borderLeft: `4px solid ${step.color}` }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: step.color }}>
                  <span className="text-[#1a1a1a] text-[16px] font-bold" style={{ fontFamily: 'var(--font-space-grotesk)' }}>{step.num}</span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold mb-2" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>{step.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: '#b8b8b8' }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-grid" style={{ background: '#141414', backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4 uppercase" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Why Choose Plexaris</h2>
            <p className="text-[16px]" style={{ color: '#777777' }}>Everything you need to streamline your supply chain</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '💬', title: 'AI Chat', desc: 'Talk to suppliers naturally. Our AI understands your needs.', color: '#4ADE80' },
              { icon: '⚡', title: 'Instant Orders', desc: 'Place orders in seconds. No more tedious form filling.', color: '#F5C042' },
              { icon: '📊', title: 'Analytics', desc: 'Track spending, trends, and supplier performance.', color: '#F5A5B8' },
              { icon: '⏱️', title: 'Save Time', desc: 'Reduce ordering time by 80%. Focus on what matters.', color: '#60A5FA' }
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl transition-all"
                style={{ background: '#1e1e1e', border: '1px solid #333333' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = feature.color;
                  e.currentTarget.style.boxShadow = `0 0 20px ${feature.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333333';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: feature.color, fontFamily: 'var(--font-space-grotesk)' }}>{feature.title}</h3>
                <p className="text-[14px]" style={{ color: '#b8b8b8' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Horeca */}
      <section className="py-24 px-6" style={{ background: '#1a1a1a' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4 uppercase" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Built For Hospitality</h2>
            <p className="text-[16px]" style={{ color: '#777777' }}>Designed specifically for restaurants, hotels, and catering</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-8 rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #333333', borderTop: '4px solid #4ADE80' }}>
              <h3 className="text-[24px] font-bold mb-6" style={{ color: '#4ADE80', fontFamily: 'var(--font-space-grotesk)' }}>Restaurants</h3>
              <ul className="space-y-4">
                {['Order ingredients from multiple suppliers', 'Track food costs and inventory', 'Get alerts for low stock items', 'Compare prices across suppliers'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: '#b8b8b8' }}>
                    <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: '#4ADE80' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-xl" style={{ background: '#1e1e1e', border: '1px solid #333333', borderTop: '4px solid #F5A5B8' }}>
              <h3 className="text-[24px] font-bold mb-6" style={{ color: '#F5A5B8', fontFamily: 'var(--font-space-grotesk)' }}>Hotels & Catering</h3>
              <ul className="space-y-4">
                {['Manage bulk orders efficiently', 'Handle multiple departments easily', 'Automated reordering for essentials', 'Centralized supplier management'].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px]" style={{ color: '#b8b8b8' }}>
                    <span className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: '#F5A5B8' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-grid" style={{ background: '#141414', backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-[36px] font-bold mb-6 uppercase" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>
            Ready to Transform Your Supply Chain?
          </h2>
          <p className="text-[18px] mb-10" style={{ color: '#777777' }}>
            Join restaurants, hotels, and catering businesses already using Plexaris
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 text-[16px] font-bold rounded-full transition-all uppercase tracking-wide"
            style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFD060';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(245, 192, 66, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F5C042';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ background: '#1a1a1a', borderTop: '1px solid #333333' }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[14px]" style={{ color: '#777777' }}>
            © 2026 Plexaris. Intelligent ordering for modern restaurants and hotels.
          </p>
        </div>
      </footer>
    </div>
  );
}
