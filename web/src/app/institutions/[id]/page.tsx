'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function InstitutionDetailPage() {
  const { id } = useParams();
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api.getInstitution(id as string)
        .then(setInstitution)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="flex justify-center mt-32 text-gray-500">Loading...</div></div>;
  }

  if (!institution) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="max-w-3xl mx-auto mt-16 text-center"><h1 className="text-2xl font-bold">Institution not found</h1></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/institutions" className="text-sm text-primary-600 hover:underline mb-4 inline-block">&larr; Back</Link>

        <div className="card mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold text-2xl">
              {institution.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{institution.name}</h1>
              <p className="text-gray-500">{institution.type?.replace(/_/g, ' ')} &middot; {institution.city}, {institution.province}</p>
            </div>
          </div>
          {institution.description && <p className="text-gray-700 mb-4">{institution.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {institution.phone && <span>Phone: {institution.phone}</span>}
            {institution.email && <span>Email: {institution.email}</span>}
            {institution.website && (
              <a href={institution.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                Website
              </a>
            )}
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Programmes ({institution.programmes?.length || 0})
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {institution.programmes?.map((prog: any) => (
            <Link key={prog.id} href={`/programmes/${prog.id}`} className="card hover:shadow-md transition-shadow">
              <span className="badge-info text-xs mb-2">{prog.qualificationLevel.replace(/_/g, ' ')}</span>
              <h3 className="font-semibold text-gray-900 mb-1">{prog.name}</h3>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{prog.durationMonths} months</span>
                {prog.tuitionFeeMin && <span>From ${prog.tuitionFeeMin}/yr</span>}
              </div>
              {prog.intakes?.some((i: any) => i.isOpen) && (
                <div className="text-xs text-success font-medium mt-2">Accepting applications</div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
