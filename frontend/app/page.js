'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle, Zap, BarChart3, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f2e] via-[#0f1419] to-[#1a1f2e]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[rgba(26,31,46,0.7)] border-b border-[rgba(34,211,238,0.2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10">
              <Image
                src="/logo%20copy.svg"
                alt="Plexaris logo"
                fill
                sizes="40px"
                className="drop-shadow-[0_4px_20px_rgba(34,211,238,0.4)]"
                priority
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
              PLEXARIS
            </span>
          </Link>
          <div className="flex gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-3 sm:px-6 py-2 rounded-lg text-white text-sm sm:text-base hover:text-[#22d3ee] transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/login?signup=true"
              className="px-3 sm:px-6 py-2 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] text-black text-sm sm:text-base font-bold hover:shadow-lg hover:shadow-[#22d3ee]/50 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden pt-20 px-4 sm:px-6">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&h=1080&fit=crop')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(26,31,46,0.85)] via-[rgba(26,31,46,0.75)] to-[rgba(26,31,46,0.9)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.15)_0%,rgba(45,212,191,0.08)_50%,rgba(34,211,238,0.15)_100%)]" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto py-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
            <span className="text-white">AI-Powered </span>
            <span className="bg-gradient-to-r from-[#22d3ee] via-[#2dd4bf] to-[#5eead4] bg-clip-text text-transparent">
              Inventory Ordering
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#b4c5db] mb-8 sm:mb-12 font-light px-2">
            The intelligent way to manage and order supplies for your restaurant, hotel, or catering business
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/login?signup=true"
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] text-black font-bold text-sm sm:text-base hover:shadow-2xl hover:shadow-[#22d3ee]/50 transition-all hover:scale-105 w-full sm:w-auto text-center"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg border border-[#22d3ee] text-[#22d3ee] font-bold text-sm sm:text-base hover:bg-[rgba(34,211,238,0.1)] transition-all w-full sm:w-auto text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 bg-[rgba(26,31,46,0.3)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-12 sm:mb-16">
            <span className="text-white">How It </span>
            <span className="bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent">
              Works
            </span>
          </h2>

          <div className="space-y-8 sm:space-y-10">
            {[
              {
                num: "01",
                title: "Connect Your Suppliers",
                desc: "Link all your regular suppliers to the platform. Our system learns your preferences and past orders"
              },
              {
                num: "02",
                title: "Chat with AI Assistant",
                desc: "Use natural language to ask for products, prices, and availability. The AI handles supplier communication"
              },
              {
                num: "03",
                title: "Smart Ordering",
                desc: "Get recommendations based on your history, current inventory, and needs. Place orders with one click"
              },
              {
                num: "04",
                title: "Track & Manage",
                desc: "Monitor deliveries, spending, and inventory levels. Get insights to optimize your supply chain"
              }
            ].map((step, idx) => (
              <div key={idx} className="flex gap-4 sm:gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] flex items-center justify-center text-black font-bold text-lg sm:text-2xl flex-shrink-0">
                    {step.num}
                  </div>
                </div>
                <div className="pt-1">
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-[#b4c5db] text-sm sm:text-base leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-4">
            <span className="text-white">Why Choose </span>
            <span className="bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent">
              Plexaris
            </span>
          </h2>
          <p className="text-center text-[#b4c5db] text-base sm:text-lg mb-12 sm:mb-16 max-w-2xl mx-auto px-2">
            Streamline your supply chain with AI-powered insights and seamless supplier integration
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: <MessageCircle className="w-8 h-8" />,
                title: "AI Chat Integration",
                desc: "Talk to suppliers naturally. Our AI understands your needs and finds the best options"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Instant Orders",
                desc: "Place orders in seconds with voice or chat. No more tedious form filling"
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Smart Analytics",
                desc: "Track spending, trends, and supplier performance in real-time"
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Save Time",
                desc: "Reduce ordering time by 80%. Manage inventory across all suppliers in one place"
              }
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group p-5 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-md bg-[rgba(37,43,59,0.5)] border border-[rgba(34,211,238,0.2)] hover:border-[#22d3ee] hover:bg-[rgba(34,211,238,0.1)] transition-all"
              >
                <div className="text-[#22d3ee] group-hover:text-[#2dd4bf] transition-colors mb-3 sm:mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-[#b4c5db] text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Horeca Benefits Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 bg-[rgba(26,31,46,0.5)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-12 sm:mb-16">
            <span className="text-white">Perfect for </span>
            <span className="bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent">
              Horeca
            </span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-8 sm:gap-12">
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Restaurants</h3>
              <ul className="space-y-3 sm:space-y-4">
                {["Order ingredients from multiple suppliers", "Track food costs and inventory", "Get alerts for low stock items", "Compare prices across suppliers"].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[#b4c5db] text-sm sm:text-base">
                    <span className="w-2 h-2 bg-[#22d3ee] rounded-full mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Hotels & Catering</h3>
              <ul className="space-y-3 sm:space-y-4">
                {["Manage bulk orders efficiently", "Handle multiple departments easily", "Automated reordering for essentials", "Centralized supplier management"].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-[#b4c5db] text-sm sm:text-base">
                    <span className="w-2 h-2 bg-[#2dd4bf] rounded-full mt-1.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">
            <span className="text-white">Ready to transform your </span>
            <span className="bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] bg-clip-text text-transparent">
              supply chain?
            </span>
          </h2>
          <p className="text-[#b4c5db] text-base sm:text-lg md:text-xl mb-6 sm:mb-8 px-2">
            Join restaurants, hotels, and catering businesses already using Plexaris
          </p>
          <Link
            href="/login?signup=true"
            className="inline-block px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#2dd4bf] text-black font-bold text-sm sm:text-base hover:shadow-2xl hover:shadow-[#22d3ee]/50 transition-all hover:scale-105"
          >
            Start Free Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[rgba(34,211,238,0.2)] py-8 px-4 sm:px-6 bg-[rgba(26,31,46,0.3)]">
        <div className="max-w-7xl mx-auto text-center text-[#b4c5db] text-xs sm:text-sm">
          <p>© 2026 Plexaris. Intelligent ordering for modern restaurants and hotels.</p>
        </div>
      </footer>
    </div>
  );
}
