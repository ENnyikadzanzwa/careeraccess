'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CA</span>
              </div>
              <span className="font-bold text-lg text-gray-900">CareerAccess</span>
            </Link>
            <div className="hidden md:flex ml-10 gap-1">
              <Link href="/programmes" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-md hover:bg-gray-50">
                Programmes
              </Link>
              <Link href="/institutions" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-md hover:bg-gray-50">
                Institutions
              </Link>
              <Link href="/guidance" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-md hover:bg-gray-50">
                Guidance
              </Link>
              {user && (
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 rounded-md hover:bg-gray-50">
                  Dashboard
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user.firstName} {user.lastName}
                </span>
                <button onClick={logout} className="btn-secondary text-sm py-1.5 px-4">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary text-sm py-1.5 px-4">
                  Login
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm py-1.5 px-4">
                  Register
                </Link>
              </div>
            )}
            <button
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1">
            <Link href="/programmes" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">Programmes</Link>
            <Link href="/institutions" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">Institutions</Link>
            <Link href="/guidance" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">Guidance</Link>
            {user && <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md">Dashboard</Link>}
          </div>
        )}
      </div>
    </nav>
  );
}
