'use client';

import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Your Gateway to Education & Career Success in Zimbabwe
            </h1>
            <p className="mt-6 text-lg text-primary-100 leading-relaxed">
              Discover programmes, get honest career guidance, and apply to secondary schools,
              colleges, universities, and vocational institutions — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/programmes" className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
                Explore Programmes
              </Link>
              <Link href="/guidance" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                Get Career Guidance
              </Link>
            </div>
            <p className="mt-6 text-primary-200 text-sm">
              Also available on WhatsApp — message us to get started!
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How CareerAccess Works</h2>
            <p className="mt-4 text-lg text-gray-600">Simple steps to your education journey</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Discover', desc: 'Search 100+ programmes across Zimbabwe\'s top institutions', icon: '🔍' },
              { step: '2', title: 'Get Guided', desc: 'Honest guidance based on your results, interests, and goals', icon: '🧭' },
              { step: '3', title: 'Apply', desc: 'Apply yourself with our guides, or let our agents handle it', icon: '📝' },
              { step: '4', title: 'Track', desc: 'Monitor your applications and get WhatsApp updates', icon: '📊' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-2">Step {item.step}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Options */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Two Ways to Apply</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card">
              <div className="text-3xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Self-Apply</h3>
              <p className="text-gray-600 mb-4">
                We provide step-by-step application guides (playbooks) for each institution.
                You apply on the institution's portal with our guidance.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Free guidance</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Step-by-step playbooks</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Document checklist</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Full control</li>
              </ul>
              <Link href="/programmes" className="btn-secondary w-full text-center block">
                Start Exploring
              </Link>
            </div>
            <div className="card border-primary-200 bg-primary-50/30">
              <div className="text-3xl mb-4">🤝</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-gray-900">Agent-Apply</h3>
                <span className="badge-info">Premium</span>
              </div>
              <p className="text-gray-600 mb-4">
                Our authorized agents apply on your behalf. They handle everything —
                portal navigation, document upload, and submission.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Agent handles everything</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> 48-hour turnaround</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> Evidence & confirmation</li>
                <li className="flex items-center gap-2"><span className="text-success">&#10003;</span> SLA-backed service</li>
              </ul>
              <Link href="/auth/register" className="btn-primary w-full text-center block">
                Get Started — from $15
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '50+', label: 'Institutions' },
              { value: '200+', label: 'Programmes' },
              { value: '10', label: 'Provinces' },
              { value: '24/7', label: 'WhatsApp Access' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-primary-200 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CA</span>
                </div>
                <span className="font-bold text-white">CareerAccess</span>
              </div>
              <p className="text-sm">Your trusted gateway for education and career progression in Zimbabwe.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/programmes" className="hover:text-white">Programmes</Link></li>
                <li><Link href="/institutions" className="hover:text-white">Institutions</Link></li>
                <li><Link href="/guidance" className="hover:text-white">Career Guidance</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white">How it Works</Link></li>
                <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/disclaimer" className="hover:text-white">Disclaimer</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            &copy; {new Date().getFullYear()} CareerAccess Zimbabwe. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
