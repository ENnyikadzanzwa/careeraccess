'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      Promise.all([
        api.getApplications().catch(() => ({ applications: [] })),
        api.getDocuments().catch(() => []),
      ]).then(([appData, docData]) => {
        setApplications(appData.applications || []);
        setDocuments(Array.isArray(docData) ? docData : []);
        setLoading(false);
      });
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center mt-32">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'badge-info',
    SUBMITTED: 'badge-info',
    UNDER_REVIEW: 'badge-warning',
    ACCEPTED: 'badge-success',
    CONDITIONALLY_ACCEPTED: 'badge-warning',
    REJECTED: 'badge-danger',
    WITHDRAWN: 'bg-gray-100 text-gray-600',
    WAITLISTED: 'badge-warning',
    DOCUMENTS_PENDING: 'badge-warning',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">Manage your applications and documents</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/programmes" className="card hover:shadow-md transition-shadow text-center">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-medium text-sm">Find Programmes</div>
          </Link>
          <Link href="/guidance" className="card hover:shadow-md transition-shadow text-center">
            <div className="text-2xl mb-2">🧭</div>
            <div className="font-medium text-sm">Get Guidance</div>
          </Link>
          <Link href="/dashboard/documents" className="card hover:shadow-md transition-shadow text-center">
            <div className="text-2xl mb-2">📎</div>
            <div className="font-medium text-sm">My Documents</div>
          </Link>
          <Link href="/dashboard/assessment" className="card hover:shadow-md transition-shadow text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-sm">Take Assessment</div>
          </Link>
        </div>

        {/* Applications */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">My Applications</h2>
            <Link href="/programmes" className="text-sm text-primary-600 hover:underline">
              + New Application
            </Link>
          </div>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No applications yet</p>
              <Link href="/programmes" className="text-primary-600 hover:underline text-sm">
                Browse programmes to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: any) => (
                <Link
                  key={app.id}
                  href={`/dashboard/applications/${app.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{app.programme?.name}</div>
                    <div className="text-sm text-gray-500">{app.institution?.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${statusColors[app.status] || 'badge-info'}`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                    {app.mode === 'AGENT' && (
                      <span className="badge bg-purple-100 text-purple-800">Agent</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">My Documents</h2>
            <Link href="/dashboard/documents" className="text-sm text-primary-600 hover:underline">
              Manage Documents
            </Link>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No documents uploaded</p>
              <Link href="/dashboard/documents" className="text-primary-600 hover:underline text-sm">
                Upload your certificates and documents
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {documents.slice(0, 8).map((doc: any) => (
                <div key={doc.id} className="p-3 rounded-lg border border-gray-200 text-center">
                  <div className="text-2xl mb-1">📄</div>
                  <div className="text-xs font-medium text-gray-700 truncate">{doc.fileName}</div>
                  <div className="text-xs text-gray-500">{doc.type.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
