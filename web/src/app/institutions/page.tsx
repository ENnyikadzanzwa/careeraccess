'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (search) params.set('search', search);
      params.set('limit', '50');
      const data = await api.getInstitutions(params.toString());
      setInstitutions(data.institutions || []);
    } catch {
      setInstitutions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, [type]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInstitutions();
  };

  const typeLabels: Record<string, string> = {
    UNIVERSITY: 'University',
    POLYTECHNIC: 'Polytechnic',
    TEACHERS_COLLEGE: 'Teachers College',
    VOCATIONAL: 'Vocational',
    SECONDARY_SCHOOL: 'Secondary School',
    PRIVATE_COLLEGE: 'Private College',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-primary-700 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-4">Institutions</h1>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <input
              type="text"
              placeholder="Search institutions..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="bg-white text-primary-700 px-6 py-3 rounded-lg font-medium">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {[{ value: '', label: 'All Types' }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                type === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No institutions found.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst: any) => (
              <Link key={inst.id} href={`/institutions/${inst.id}`} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-bold">
                    {inst.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{inst.name}</h3>
                    <span className="text-xs text-gray-500">{typeLabels[inst.type] || inst.type}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{inst.city}, {inst.province}</p>
                <div className="text-xs text-primary-600 font-medium">
                  {inst._count?.programmes || 0} programme(s)
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
