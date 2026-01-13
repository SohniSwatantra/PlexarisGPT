'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-grid" style={{ background: '#141414' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(20, 20, 20, 0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #333333' }}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/plexaris-logo.png"
              alt="Plexaris"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-[18px] font-semibold" style={{ color: '#f5f0e1', letterSpacing: '-0.02em', fontFamily: 'var(--font-space-grotesk)' }}>Plexaris</span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="px-4 py-2 text-[14px] font-medium rounded-full transition-colors"
              style={{ color: '#b8b8b8' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f5f0e1'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#b8b8b8'}
            >
              Pricing
            </a>
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

      {/* Hero Section with Animated Logo Background */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated Background Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full animate-pulse-slow" style={{ background: 'radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, rgba(96, 165, 250, 0.05) 40%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute w-[500px] h-[500px] rounded-full animate-pulse-slow-delay" style={{ background: 'radial-gradient(circle, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.03) 50%, transparent 70%)', filter: 'blur(30px)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full animate-glow-pulse" style={{ background: 'radial-gradient(circle, rgba(245, 192, 66, 0.12) 0%, rgba(245, 192, 66, 0.03) 50%, transparent 70%)', filter: 'blur(20px)' }} />
          <div className="relative animate-float">
            <div className="absolute -inset-8 rounded-full animate-spin-slow" style={{ border: '1px solid transparent', borderTopColor: 'rgba(96, 165, 250, 0.3)', borderRightColor: 'rgba(74, 222, 128, 0.2)' }} />
            <div className="absolute -inset-16 rounded-full animate-spin-slower" style={{ border: '1px dashed transparent', borderTopColor: 'rgba(245, 192, 66, 0.2)', borderLeftColor: 'rgba(245, 165, 184, 0.15)' }} />
            <Image src="/plexaris-logo.png" alt="" width={350} height={350} className="object-contain opacity-20 animate-logo-glow" style={{ filter: 'drop-shadow(0 0 60px rgba(96, 165, 250, 0.4))' }} priority />
          </div>
          <div className="absolute w-2 h-2 rounded-full animate-particle-1" style={{ background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full animate-particle-2" style={{ background: '#60A5FA', boxShadow: '0 0 8px #60A5FA' }} />
          <div className="absolute w-2 h-2 rounded-full animate-particle-3" style={{ background: '#F5C042', boxShadow: '0 0 10px #F5C042' }} />
          <div className="absolute w-1 h-1 rounded-full animate-particle-4" style={{ background: '#F5A5B8', boxShadow: '0 0 6px #F5A5B8' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full animate-particle-5" style={{ background: '#60A5FA', boxShadow: '0 0 8px #60A5FA' }} />
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-up" style={{ background: 'rgba(30, 30, 30, 0.8)', border: '1px solid #333333', backdropFilter: 'blur(10px)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#4ADE80' }} />
            <span className="text-[13px] font-medium" style={{ color: '#b8b8b8' }}>AI-powered ordering for hospitality</span>
          </div>
          <h1 className="text-[48px] sm:text-[56px] md:text-[72px] font-bold leading-[1.05] mb-6 animate-fade-up" style={{ color: '#f5f0e1', letterSpacing: '-0.03em', fontFamily: 'var(--font-space-grotesk)', animationDelay: '0.1s' }}>
            THE INTELLIGENT WAY TO<br /><span className="text-gradient-animated">MANAGE SUPPLIES</span>
          </h1>
          <p className="text-[20px] leading-relaxed mb-6 max-w-2xl mx-auto animate-fade-up" style={{ color: '#b8b8b8', animationDelay: '0.2s', fontWeight: '500' }}>
            Connect Horeca directly with Suppliers. Skip the middleman.
          </p>
          <div className="inline-flex items-center px-6 py-3 rounded-full mb-12 animate-fade-up" style={{ background: '#D9F99D', animationDelay: '0.25s' }}>
            <span className="text-[18px] font-semibold" style={{ color: '#1a1a1a' }}>Save 15-20% on margins.</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <Link href="/signup" className="px-8 py-4 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide" style={{ background: '#F5C042', color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD060'; e.currentTarget.style.boxShadow = '0 0 30px rgba(245, 192, 66, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5C042'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              Start Free Today
            </Link>
            <Link href="/login" className="px-8 py-4 text-[15px] font-semibold rounded-full transition-all uppercase tracking-wide" style={{ background: 'transparent', border: '1px solid #333333', color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30, 30, 30, 0.8)'; e.currentTarget.style.borderColor = '#F5C042'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#333333'; }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Order with Voice or Text */}
      <section className="py-24 px-6" style={{ background: '#0a1628' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Order with 🗣️ or Text</h2>
            <p className="text-[16px]" style={{ color: '#b8b8b8' }}>Find your preferred suppliers and manage inventory effortlessly - right from ChatGPT</p>
          </div>

          {/* Loom Video */}
          <div className="rounded-2xl overflow-hidden mb-12" style={{ boxShadow: '0 0 60px rgba(96, 165, 250, 0.15)' }}>
            <iframe
              src="https://www.loom.com/embed/9a3780f60ddf420dadff2a6e0dd51b87?autoplay=1&hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen"
              className="w-full aspect-video"
              style={{ border: 'none', display: 'block' }}
            />
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>, label: 'Voice Ordering' },
              { icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, label: 'Text Commands' },
              { icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>, label: 'Smart Recommendations' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="flex justify-center mb-3">{item.icon}</div>
                <p className="text-[14px] font-medium" style={{ color: '#f5f0e1' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started in 3 Simple Steps */}
      <section className="py-24 px-6" style={{ background: '#e8e5dc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>Get Started in 3 Simple Steps</h2>
            <p className="text-[16px]" style={{ color: '#666666' }}>From setup to your first order in under 5 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '1', icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>, title: 'Install the App', desc: 'Add Plexaris to your ChatGPT apps with one click' },
              { num: '2', icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>, title: 'Connect Your Account', desc: 'Sign up free and link your Horeca business profile' },
              { num: '3', icon: <svg className="w-8 h-8" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>, title: 'Start Ordering', desc: 'Use voice or text to find suppliers and place orders instantly' }
            ].map((step, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 text-center relative" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#60A5FA' }}>
                  <span className="text-white font-bold">{step.num}</span>
                </div>
                <div className="flex justify-center mb-4">{step.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>{step.title}</h3>
                <p className="text-[14px]" style={{ color: '#666666' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sound Familiar? */}
      <section className="py-24 px-6" style={{ background: '#141414' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#f87171', fontFamily: 'var(--font-space-grotesk)' }}>Sound Familiar?</h2>
            <p className="text-[16px]" style={{ color: '#b8b8b8' }}>The frustrations of working with middlemen</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <svg className="w-10 h-10" fill="none" stroke="#f87171" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>, title: 'Margin Squeeze', desc: 'You keep 10-15% while the middleman takes 35-40% of your hard work' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#f87171" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Hidden Fees', desc: 'Fixed fees, marketing contributions, payment fees - they add up to 10%+ of your revenue' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#f87171" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, title: 'No Customer Visibility', desc: 'You have no idea who buys your products, at what price, or how satisfied they are' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#f87171" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>, title: 'Private Label Threat', desc: 'When your product succeeds, they copy it with their own label and kill your business' }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>{item.title}</h3>
                <p className="text-[14px]" style={{ color: '#b8b8b8' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="#for-suppliers" className="text-[16px] font-medium transition-colors" style={{ color: '#60A5FA' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#60A5FA'}>
              There is a better way →
            </a>
          </div>
        </div>
      </section>

      {/* For Suppliers */}
      <section id="for-suppliers" className="py-24 px-6" style={{ background: '#0f172a' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#7dd3fc', fontFamily: 'var(--font-space-grotesk)' }}>For Suppliers</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <svg className="w-10 h-10" fill="none" stroke="#facc15" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>, title: 'Higher Margins', desc: '15-20% more by bypassing wholesaler fees', color: '#facc15' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>, title: 'Customer Intelligence', desc: 'Know who buys, when, and at what price', color: '#60A5FA' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#4ade80" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>, title: 'Marketing Control', desc: 'Direct promotions without middleman restrictions', color: '#4ade80' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#c084fc" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, title: 'Independence', desc: 'Escape wholesaler lock-in and private label threats', color: '#c084fc' }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>{item.title}</h3>
                <p className="text-[14px]" style={{ color: '#94a3b8' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seamless Integration */}
      <section className="py-24 px-6" style={{ background: '#e8e5dc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>Seamless Integration with Your Systems</h2>
            <p className="text-[16px]" style={{ color: '#666666' }}>Connect ChatGPT ordering directly to your existing infrastructure</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>, title: 'ERP Integration', desc: 'Sync orders, inventory, and customer data with your ERP system in real-time' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>, title: 'Warehouse Management', desc: 'Automatic stock updates and picking lists sent directly to your WMS' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>, title: 'Logistics & Delivery', desc: 'Integrated shipping and delivery tracking for seamless fulfillment' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>{item.title}</h3>
                <p className="text-[14px]" style={{ color: '#666666' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Horeca */}
      <section className="py-24 px-6" style={{ background: '#e8e5dc' }}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-10" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-[36px] font-bold" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>For Horeca</h2>
              <span className="px-4 py-2 rounded-full text-[14px] font-semibold" style={{ background: '#4ade80', color: '#fff' }}>100% Free</span>
            </div>
            <p className="text-[16px] mb-8" style={{ color: '#666666' }}>Hotels, Restaurants & Cafes</p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <svg className="w-10 h-10" fill="none" stroke="#4ade80" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, title: 'Better Pricing', desc: 'Direct from suppliers, no wholesaler markup' },
                { icon: <svg className="w-10 h-10" fill="none" stroke="#4ade80" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, title: 'AI-Powered Ordering', desc: 'Conversational ordering powered by ChatGPT' },
                { icon: <svg className="w-10 h-10" fill="none" stroke="#4ade80" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>, title: 'Product Discovery', desc: 'Smart recommendations and ingredient suggestions' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: '#f8f7f4' }}>
                  <div className="mb-4">{item.icon}</div>
                  <h3 className="text-[16px] font-bold mb-2" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>{item.title}</h3>
                  <p className="text-[14px]" style={{ color: '#666666' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Connected to Your Restaurant Operations */}
      <section className="py-24 px-6" style={{ background: '#0f172a' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#f5f0e1', fontFamily: 'var(--font-space-grotesk)' }}>Connected to Your Restaurant Operations</h2>
            <p className="text-[16px]" style={{ color: '#94a3b8' }}>From ordering to menu optimization - all in one AI-powered platform</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>, title: 'Point of Sale', desc: 'Real-time sync with your POS for seamless order tracking and sales data' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>, title: 'Stock Inventory', desc: 'Automatic inventory updates and low-stock alerts when you order' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" /></svg>, title: 'Cost & Price Calculations', desc: 'Know your exact food costs and optimize margins automatically' },
              { icon: <svg className="w-10 h-10" fill="none" stroke="#60A5FA" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" /></svg>, title: 'Menu Engineering', desc: 'AI-powered menu optimization based on cost, popularity, and margins' }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ background: '#1e293b', border: '1px solid #334155' }}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-[18px] font-bold mb-2" style={{ color: '#7dd3fc', fontFamily: 'var(--font-space-grotesk)' }}>{item.title}</h3>
                <p className="text-[14px]" style={{ color: '#94a3b8' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="https://app.rapidforms.co/p/43ffab" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 rounded-full text-[14px] font-semibold transition-all" style={{ background: '#5eead4', color: '#0f172a' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#99f6e4'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#5eead4'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              All Free for Horeca
            </a>
          </div>
        </div>
      </section>

      {/* Simple, Transparent Pricing */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#e8e5dc' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[40px] font-bold mb-4" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>Simple, Transparent Pricing</h2>
            <p className="text-[16px]" style={{ color: '#666666' }}>No onboarding fees. No monthly subscriptions. Just results.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Horeca Pricing */}
            <div className="bg-white rounded-3xl p-8 relative overflow-hidden" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #5eead4, #4ade80)' }} />
              <p className="text-[14px] font-medium mb-2" style={{ color: '#666666' }}>For Horeca</p>
              <p className="text-[56px] font-bold mb-1" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>€0</p>
              <p className="text-[14px] mb-6" style={{ color: '#666666' }}>Forever Free</p>
              <ul className="space-y-4 mb-8">
                {['Access to all suppliers', 'AI-powered ordering', 'No hidden fees', 'No credit card required'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px]" style={{ color: '#1a1a1a' }}>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="#4ade80" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="https://app.rapidforms.co/p/43ffab" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-full text-center text-[15px] font-semibold transition-all" style={{ background: '#4ade80', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#4ade80'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Get Started Free
              </a>
            </div>
            {/* Supplier Pricing */}
            <div className="bg-white rounded-3xl p-8 relative overflow-hidden" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }}>
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #60A5FA, #7dd3fc)' }} />
              <p className="text-[14px] font-medium mb-2" style={{ color: '#666666' }}>For Suppliers</p>
              <p className="text-[56px] font-bold mb-1" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>3%</p>
              <p className="text-[14px] mb-6" style={{ color: '#666666' }}>Platform Fee</p>
              <ul className="space-y-4 mb-8">
                {['No onboarding fee', 'No monthly subscription', 'Pay only on successful orders', 'Direct customer access', 'Full analytics dashboard'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[14px]" style={{ color: '#1a1a1a' }}>
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="#4ade80" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <a href="https://app.rapidforms.co/p/57e6b2" target="_blank" rel="noopener noreferrer" className="block w-full py-4 rounded-full text-center text-[15px] font-semibold transition-all" style={{ background: '#1a1a1a', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Start Selling
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Join Plexaris Today */}
      <section className="py-24 px-6" style={{ background: '#e8e5dc' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl p-12 text-center" style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }}>
            <h2 className="text-[36px] font-bold mb-8" style={{ color: '#1a1a1a', fontFamily: 'var(--font-space-grotesk)' }}>Join Plexaris Today</h2>
            <div className="flex items-center justify-center gap-4">
              <a href="https://app.rapidforms.co/p/57e6b2" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full text-[15px] font-semibold transition-all" style={{ background: '#1a1a1a', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Supplier
              </a>
              <a href="https://app.rapidforms.co/p/43ffab" target="_blank" rel="noopener noreferrer" className="px-8 py-4 rounded-full text-[15px] font-semibold transition-all" style={{ background: '#1a1a1a', color: '#fff' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                HoReCa
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ background: '#1a1a1a', borderTop: '1px solid #333333' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/plexaris-logo.png" alt="Plexaris" width={32} height={32} className="object-contain" />
            <span className="text-[14px]" style={{ color: '#777777' }}>© 2026 Plexaris. Intelligent ordering for modern restaurants and hotels.</span>
          </div>
        </div>
      </footer>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-slower { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
        @keyframes pulse-slow-delay { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.08); } }
        @keyframes glow-pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
        @keyframes logo-glow { 0%, 100% { filter: drop-shadow(0 0 60px rgba(96, 165, 250, 0.4)); opacity: 0.15; } 50% { filter: drop-shadow(0 0 80px rgba(96, 165, 250, 0.6)) drop-shadow(0 0 120px rgba(74, 222, 128, 0.3)); opacity: 0.25; } }
        @keyframes particle-1 { 0%, 100% { transform: translate(-150px, -100px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(150px, 100px); opacity: 0; } }
        @keyframes particle-2 { 0%, 100% { transform: translate(120px, -80px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(-120px, 80px); opacity: 0; } }
        @keyframes particle-3 { 0%, 100% { transform: translate(-80px, 120px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(80px, -120px); opacity: 0; } }
        @keyframes particle-4 { 0%, 100% { transform: translate(100px, 100px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(-100px, -100px); opacity: 0; } }
        @keyframes particle-5 { 0%, 100% { transform: translate(-60px, -140px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translate(60px, 140px); opacity: 0; } }
        @keyframes gradient-shift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-slower { animation: spin-slower 30s linear infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-slow-delay { animation: pulse-slow-delay 4s ease-in-out infinite; animation-delay: 1s; }
        .animate-glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        .animate-logo-glow { animation: logo-glow 4s ease-in-out infinite; }
        .animate-particle-1 { animation: particle-1 8s ease-in-out infinite; }
        .animate-particle-2 { animation: particle-2 10s ease-in-out infinite; animation-delay: 1s; }
        .animate-particle-3 { animation: particle-3 9s ease-in-out infinite; animation-delay: 2s; }
        .animate-particle-4 { animation: particle-4 11s ease-in-out infinite; animation-delay: 0.5s; }
        .animate-particle-5 { animation: particle-5 7s ease-in-out infinite; animation-delay: 3s; }
        .text-gradient-animated { background: linear-gradient(90deg, #F5C042, #60A5FA, #4ADE80, #F5A5B8, #F5C042); background-size: 300% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradient-shift 6s ease infinite; }
      `}</style>
    </div>
  );
}
