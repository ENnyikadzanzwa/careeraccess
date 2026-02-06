'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default function ProgrammeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [programme, setProgramme] = useState<any>(null);
  const [valueAnalysis, setValueAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        api.getProgramme(id as string),
        api.getValueAnalysis(id as string).catch(() => null),
      ]).then(([prog, value]) => {
        setProgramme(prog);
        setValueAnalysis(value);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  const handleApply = async (mode: 'SELF' | 'AGENT') => {
    if (!user) {
      router.push('/auth/register');
      return;
    }
    try {
      const app = await api.createApplication({ programmeId: id, mode });
      router.push(`/dashboard/applications/${app.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center mt-32 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!programme) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto mt-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Programme not found</h1>
          <Link href="/programmes" className="text-primary-600 hover:underline mt-4 inline-block">
            Browse all programmes
          </Link>
        </div>
      </div>
    );
  }

  const reqs = programme.entryRequirements as Record<string, any> || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/programmes" className="text-sm text-primary-600 hover:underline mb-4 inline-block">
          &larr; Back to programmes
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <span className="badge-info mb-3">{programme.qualificationLevel.replace(/_/g, ' ')}</span>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{programme.name}</h1>
              <p className="text-gray-600 mb-4">
                {programme.institution?.name} &middot; {programme.institution?.city}, {programme.institution?.province}
              </p>
              {programme.description && (
                <p className="text-gray-700 leading-relaxed">{programme.description}</p>
              )}
            </div>

            {/* Details */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Programme Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Duration</span>
                  <div className="font-medium">{programme.durationMonths} months</div>
                </div>
                <div>
                  <span className="text-gray-500">Study Modes</span>
                  <div className="font-medium">{programme.studyModes?.map((m: string) => m.replace(/_/g, ' ')).join(', ')}</div>
                </div>
                {programme.faculty && (
                  <div>
                    <span className="text-gray-500">Faculty</span>
                    <div className="font-medium">{programme.faculty}</div>
                  </div>
                )}
                {programme.department && (
                  <div>
                    <span className="text-gray-500">Department</span>
                    <div className="font-medium">{programme.department}</div>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Tuition Fees</span>
                  <div className="font-medium">
                    {programme.tuitionFeeMin
                      ? `$${programme.tuitionFeeMin}${programme.tuitionFeeMax ? ` - $${programme.tuitionFeeMax}` : ''}/year`
                      : 'Contact institution'}
                  </div>
                </div>
                {programme.applicationFee && (
                  <div>
                    <span className="text-gray-500">Application Fee</span>
                    <div className="font-medium">${programme.applicationFee}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Requirements */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Entry Requirements</h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {programme.oLevelMin && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600">&#9679;</span>
                    Minimum {programme.oLevelMin} O-Level passes (A-C)
                  </li>
                )}
                {programme.aLevelMin && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600">&#9679;</span>
                    Minimum {programme.aLevelMin} A-Level passes
                  </li>
                )}
                {programme.requiredSubjects?.length > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600">&#9679;</span>
                    Required subjects: {programme.requiredSubjects.join(', ')}
                  </li>
                )}
                {reqs.minimumLevel && (
                  <li className="flex items-center gap-2">
                    <span className="text-primary-600">&#9679;</span>
                    Minimum education level: {reqs.minimumLevel.replace(/_/g, ' ')}
                  </li>
                )}
              </ul>
              {programme.requiredDocuments?.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-900 mt-4 mb-2">Required Documents</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {programme.requiredDocuments.map((doc: string) => (
                      <li key={doc} className="flex items-center gap-2">
                        <span>📎</span> {doc}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Value Analysis */}
            {valueAnalysis && (
              <div className="card">
                <h2 className="font-bold text-gray-900 mb-4">Programme Value Analysis</h2>
                <p className="text-sm text-gray-700 mb-4">{valueAnalysis.analysis}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(valueAnalysis.scores).map(([key, value]: [string, any]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="font-medium">{value}/100</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {valueAnalysis.warnings?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {valueAnalysis.warnings.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                        <span>&#9888;&#65039;</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply card */}
            <div className="card sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4">Apply for this Programme</h3>

              {programme.intakes?.some((i: any) => i.isOpen) ? (
                <>
                  <div className="mb-4">
                    <span className="badge-success">Accepting Applications</span>
                  </div>
                  {programme.intakes?.filter((i: any) => i.isOpen).map((intake: any) => (
                    <div key={intake.id} className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{intake.name} {intake.year}</span>
                      {intake.closesAt && (
                        <span className="text-gray-500"> &middot; Closes {new Date(intake.closesAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  ))}
                  <div className="space-y-3 mt-4">
                    <button onClick={() => handleApply('SELF')} className="btn-primary w-full">
                      Self-Apply (Free Guidance)
                    </button>
                    <button onClick={() => handleApply('AGENT')} className="btn-secondary w-full">
                      Agent-Apply (from $15)
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <span className="badge-warning">No Open Intake</span>
                  <p className="text-sm text-gray-500 mt-2">Check back later or contact the institution.</p>
                </div>
              )}
            </div>

            {/* Institution info */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Institution</h3>
              <div className="text-sm space-y-2 text-gray-600">
                <div className="font-medium text-gray-900">{programme.institution?.name}</div>
                <div>{programme.institution?.type?.replace(/_/g, ' ')}</div>
                <div>{programme.institution?.city}, {programme.institution?.province}</div>
                {programme.institution?.website && (
                  <a href={programme.institution.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline block">
                    Visit website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
