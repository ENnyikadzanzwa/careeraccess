'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && id) {
      api.getApplication(id as string)
        .then(setApplication)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, id, router]);

  const handleSubmit = async () => {
    if (!confirm('Submit this application?')) return;
    try {
      const updated = await api.submitApplication(application.id);
      setApplication({ ...application, ...updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      const updated = await api.withdrawApplication(application.id, 'Withdrawn by applicant');
      setApplication({ ...application, ...updated });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="flex justify-center mt-32 text-gray-500">Loading...</div></div>;
  }

  if (!application) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="max-w-3xl mx-auto mt-16 text-center"><h1 className="text-2xl font-bold">Application not found</h1></div></div>;
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'badge-info', SUBMITTED: 'badge-info', UNDER_REVIEW: 'badge-warning',
    ACCEPTED: 'badge-success', CONDITIONALLY_ACCEPTED: 'badge-warning',
    REJECTED: 'badge-danger', WITHDRAWN: 'bg-gray-100 text-gray-600', WAITLISTED: 'badge-warning',
    DOCUMENTS_PENDING: 'badge-warning',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="text-sm text-primary-600 hover:underline mb-4 inline-block">&larr; Dashboard</Link>

        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{application.programme?.name}</h1>
              <p className="text-gray-500">{application.institution?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${statusColors[application.status]}`}>
                {application.status.replace(/_/g, ' ')}
              </span>
              {application.mode === 'AGENT' && (
                <span className="badge bg-purple-100 text-purple-800">Agent-Assisted</span>
              )}
            </div>
          </div>

          {application.submittedAt && (
            <p className="text-sm text-gray-500">Submitted: {new Date(application.submittedAt).toLocaleDateString()}</p>
          )}
          {application.decisionNotes && (
            <div className="mt-3 p-3 rounded-lg bg-gray-50 text-sm text-gray-700">
              <strong>Decision notes:</strong> {application.decisionNotes}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {application.status === 'DRAFT' && (
              <button onClick={handleSubmit} className="btn-primary">Submit Application</button>
            )}
            {['DRAFT', 'SUBMITTED', 'DOCUMENTS_PENDING'].includes(application.status) && (
              <button onClick={handleWithdraw} className="btn-danger">Withdraw</button>
            )}
          </div>
        </div>

        {/* Agent job info */}
        {application.agentJob && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-3">Agent Service</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Status</span>
                <div className="font-medium capitalize">{application.agentJob.status.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <span className="text-gray-500">Fee</span>
                <div className="font-medium">${application.agentJob.fee}</div>
              </div>
              <div>
                <span className="text-gray-500">Consent</span>
                <div className="font-medium">{application.agentJob.consentGiven ? 'Given' : 'Pending'}</div>
              </div>
              {application.agentJob.slaDeadline && (
                <div>
                  <span className="text-gray-500">Deadline</span>
                  <div className="font-medium">{new Date(application.agentJob.slaDeadline).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Documents</h2>
            <Link href="/dashboard/documents" className="text-sm text-primary-600 hover:underline">
              Manage Documents
            </Link>
          </div>
          {application.documents?.length > 0 ? (
            <div className="space-y-2">
              {application.documents.map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 text-sm">
                  <span>📄</span>
                  <span>{d.document?.fileName}</span>
                  <span className="text-gray-400">{d.document?.type?.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No documents attached yet.</p>
          )}
        </div>

        {/* Timeline */}
        {application.timeline?.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-4">
              {application.timeline.map((event: any) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {event.status.replace(/_/g, ' ')}
                    </div>
                    {event.note && <div className="text-sm text-gray-500">{event.note}</div>}
                    <div className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payments */}
        {application.payments?.length > 0 && (
          <div className="card mt-6">
            <h2 className="font-bold text-gray-900 mb-3">Payments</h2>
            <div className="space-y-2">
              {application.payments.map((pay: any) => (
                <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm">
                  <div>
                    <span className="font-medium">{pay.type.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400 ml-2">Ref: {pay.reference}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${pay.amount}</span>
                    <span className={`badge ${pay.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>
                      {pay.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
