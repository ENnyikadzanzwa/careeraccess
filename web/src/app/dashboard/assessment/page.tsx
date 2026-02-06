'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function AssessmentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      api.getQuestions()
        .then(setQuestions)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const handleAnswer = (value: number) => {
    const question = questions[currentIdx];
    const newResponses = [...responses, { questionId: question.id, answer: value }];
    setResponses(newResponses);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Submit
      setLoading(true);
      api.submitAssessment(newResponses)
        .then((data) => setResults(data.results))
        .catch((err) => alert(err.message))
        .finally(() => setLoading(false));
    }
  };

  if (authLoading || (loading && !started)) {
    return <div className="min-h-screen bg-gray-50"><Navbar /><div className="flex justify-center mt-32 text-gray-500">Loading...</div></div>;
  }

  if (results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="card">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Assessment Results</h1>

            <div className="space-y-4 mb-6">
              {[
                { label: 'Verbal', value: results.verbal },
                { label: 'Numerical', value: results.numerical },
                { label: 'Logical', value: results.logical },
                { label: 'Creative', value: results.creative },
                { label: 'Practical', value: results.practical },
                { label: 'Social', value: results.social },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        item.value >= 70 ? 'bg-green-500' : item.value >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="font-bold text-gray-900 mb-2">Top Strengths</h2>
              <div className="flex gap-2">
                {results.topStrengths?.map((s: string) => (
                  <span key={s} className="badge-success capitalize">{s}</span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="font-bold text-gray-900 mb-2">Suggested Fields</h2>
              <div className="flex flex-wrap gap-2">
                {results.suggestedFields?.map((f: string) => (
                  <span key={f} className="badge-info">{f}</span>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg">{results.summary}</p>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/programmes')}
                className="btn-primary"
              >
                Find Programmes
              </button>
              <button
                onClick={() => { setResults(null); setResponses([]); setCurrentIdx(0); setStarted(false); }}
                className="btn-secondary"
              >
                Retake Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="card">
            <div className="text-4xl mb-4">📊</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Aptitude & Interest Assessment</h1>
            <p className="text-gray-600 mb-6">
              This short assessment will evaluate your strengths across verbal, numerical,
              logical, creative, practical, and social skills. It takes about 5 minutes.
            </p>
            <p className="text-sm text-gray-500 mb-6">{questions.length} questions</p>
            <button onClick={() => setStarted(true)} className="btn-primary">
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentIdx + 1} of {questions.length}</span>
            <span className="capitalize">{question.category}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{question.text}</h2>
          <div className="space-y-3">
            {question.options.map((opt: any, i: number) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.value)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-primary-50 hover:border-primary-300 transition-colors"
              >
                <span className="font-medium text-gray-900">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
