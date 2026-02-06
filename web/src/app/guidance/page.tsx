'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function GuidancePage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await api.getRecommendations();
      setRecommendations(data);
    } catch {
      setRecommendations(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-gradient-to-br from-primary-700 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Career Guidance</h1>
          <p className="text-primary-100 text-lg max-w-2xl mx-auto">
            Get honest, future-aware guidance based on your results, interests, and the realities of Zimbabwe's economy.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-bold text-gray-900 mb-2">Aptitude Assessment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Discover your strengths and get personalized career suggestions.
            </p>
            <Link href="/dashboard/assessment" className="btn-primary text-sm">
              Take Assessment
            </Link>
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold text-gray-900 mb-2">Programme Matching</h3>
            <p className="text-sm text-gray-600 mb-4">
              Find programmes that match your results and preferences.
            </p>
            {user ? (
              <button onClick={fetchRecommendations} className="btn-primary text-sm" disabled={loading}>
                {loading ? 'Loading...' : 'Get Recommendations'}
              </button>
            ) : (
              <Link href="/auth/register" className="btn-primary text-sm">
                Sign Up to Get Matched
              </Link>
            )}
          </div>

          <div className="card text-center">
            <div className="text-3xl mb-3">⚖️</div>
            <h3 className="font-bold text-gray-900 mb-2">Programme Comparison</h3>
            <p className="text-sm text-gray-600 mb-4">
              Compare programmes side-by-side including value scores and AI impact.
            </p>
            <Link href="/programmes" className="btn-secondary text-sm">
              Browse & Compare
            </Link>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations && (
          <div className="space-y-8">
            {recommendations.bestFit?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Best Fit Programmes</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendations.bestFit.map((prog: any) => (
                    <Link key={prog.id} href={`/programmes/${prog.id}`} className="card hover:shadow-md transition-shadow">
                      <span className="badge-success text-xs mb-2">Best Match</span>
                      <h3 className="font-semibold text-gray-900">{prog.name}</h3>
                      <p className="text-sm text-gray-500">{prog.institution?.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recommendations.eligible?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">You're Eligible For</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.eligible.map((prog: any) => (
                    <Link key={prog.id} href={`/programmes/${prog.id}`} className="card hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-gray-900 text-sm">{prog.name}</h3>
                      <p className="text-xs text-gray-500">{prog.institution?.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recommendations.nearMiss?.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Almost There (Near-Miss)</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {recommendations.nearMiss.map((prog: any) => (
                    <div key={prog.id} className="card border-amber-200 bg-amber-50/30">
                      <h3 className="font-semibold text-gray-900">{prog.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{prog.institution?.name}</p>
                      {prog.gap?.length > 0 && (
                        <div className="text-xs text-amber-700">
                          Gap: {prog.gap.join('; ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guidance tips */}
        <div className="mt-12 card bg-primary-50 border-primary-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Honest Guidance Notes</h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">&#9679;</span>
              <span>No programme guarantees employment. We score programmes on economic demand, not promises.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">&#9679;</span>
              <span>AI is changing many careers. Check our AI automation risk scores before choosing a path.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">&#9679;</span>
              <span>Consider self-employment potential — Zimbabwe's economy rewards entrepreneurship.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">&#9679;</span>
              <span>A certificate can be a stepping stone to a diploma, then a degree. Don't see it as a dead end.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">&#9679;</span>
              <span>Remote work-ready skills (IT, digital marketing, design) open doors beyond Zimbabwe.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
