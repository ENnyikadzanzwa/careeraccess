'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

const DOCUMENT_TYPES = [
  { value: 'O_LEVEL_CERTIFICATE', label: 'O-Level Certificate' },
  { value: 'A_LEVEL_CERTIFICATE', label: 'A-Level Certificate' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'BIRTH_CERTIFICATE', label: 'Birth Certificate' },
  { value: 'PASSPORT_PHOTO', label: 'Passport Photo' },
  { value: 'TRANSCRIPT', label: 'Transcript' },
  { value: 'RECOMMENDATION_LETTER', label: 'Recommendation Letter' },
  { value: 'PERSONAL_STATEMENT', label: 'Personal Statement' },
  { value: 'PROOF_OF_PAYMENT', label: 'Proof of Payment' },
  { value: 'OTHER', label: 'Other' },
];

export default function DocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('O_LEVEL_CERTIFICATE');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      api.getDocuments()
        .then((data) => setDocuments(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const doc = await api.uploadDocument(file, docType);
      setDocuments([doc, ...documents]);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(id);
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="flex justify-center mt-32 text-gray-500">Loading...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Documents</h1>

        {/* Upload */}
        <div className="card mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Upload Document</h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select className="input-field" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF, JPG, PNG, DOC)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleUpload}
                disabled={uploading}
                className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>
            {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
          </div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No documents uploaded yet. Upload your certificates and documents above.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">📄</div>
                  <div>
                    <div className="font-medium text-gray-900">{doc.fileName}</div>
                    <div className="text-sm text-gray-500">
                      {doc.type.replace(/_/g, ' ')} &middot; {(doc.fileSize / 1024).toFixed(0)} KB
                      {doc.isVerified && <span className="ml-2 badge-success">Verified</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(doc.id)} className="text-sm text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
