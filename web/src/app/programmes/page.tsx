'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProgrammes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (level) params.set('qualificationLevel', level);
      params.set('page', String(page));
      params.set('limit', '12');

      const data = await api.getProgrammes(params.toString());
      setProgrammes(data.programmes || []);
      setTotalPages(data.pages || 1);
    } catch {
      setProgrammes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgrammes();
  }, [page, level]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProgrammes();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-4">Browse Programmes</h1>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
            <input
              type="text"
              placeholder="Search programmes, subjects, or institutions..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="bg-white text-primary-700 px-6 py-3 rounded-lg font-medium hover:bg-primary-50">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: '', label: 'All Levels' },
            { value: 'CERTIFICATE', label: 'Certificate' },
            { value: 'NATIONAL_DIPLOMA', label: 'National Diploma' },
            { value: 'DIPLOMA', label: 'Diploma' },
            { value: 'BACHELOR', label: 'Bachelor\'s Degree' },
            { value: 'HONOURS', label: 'Honours' },
            { value: 'MASTERS', label: 'Master\'s' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLevel(opt.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                level === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading programmes...</div>
        ) : programmes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No programmes found</h3>
            <p className="text-gray-600">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programmes.map((prog: any) => (
                <Link key={prog.id} href={`/programmes/${prog.id}`} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="badge-info">{prog.qualificationLevel.replace(/_/g, ' ')}</span>
                    {prog.overallValueScore && (
                      <span className="text-xs font-medium text-gray-500">
                        Value: {prog.overallValueScore}/100
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{prog.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {prog.institution?.name} &middot; {prog.institution?.city}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>{prog.durationMonths} months</span>
                    {prog.tuitionFeeMin && <span>From ${prog.tuitionFeeMin}/yr</span>}
                    {prog.studyModes?.length > 0 && <span>{prog.studyModes[0].replace(/_/g, ' ')}</span>}
                  </div>
                  {prog.intakes?.length > 0 && (
                    <div className="mt-3 text-xs text-success font-medium">Accepting applications</div>
                  )}
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-1.5 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-1.5 text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
