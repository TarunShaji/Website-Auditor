import React, { useState } from 'react';
import { AuditForm } from './components/AuditForm';
import { AuditProgress } from './components/AuditProgress';
import { AuditResults } from './components/AuditResults';
import { Shield, Sparkles } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  const [auditState, setAuditState] = useState({
    status: 'idle',
    auditId: null,
    progress: [],
    result: null,
    error: null
  });

  const startAudit = async ({ url, maxPages, unlimited, enableAI }) => {
    try {
      setAuditState({
        status: 'starting',
        auditId: null,
        progress: [],
        result: null,
        error: null
      });

      const response = await fetch(`${API_BASE_URL}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, maxPages, unlimited, enableAI }),
      });

      if (!response.ok) {
        throw new Error('Failed to start audit');
      }

      const data = await response.json();

      setAuditState(prev => ({
        ...prev,
        status: 'running',
        auditId: data.auditId
      }));

      pollAuditStatus(data.auditId);
    } catch (error) {
      setAuditState({
        status: 'error',
        auditId: null,
        progress: [],
        result: null,
        error: error.message
      });
    }
  };

  const pollAuditStatus = async (auditId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/audit/${auditId}/status`);

        if (!response.ok) {
          throw new Error('Failed to fetch audit status');
        }

        const data = await response.json();

        setAuditState(prev => ({
          ...prev,
          progress: data.progress || []
        }));

        if (data.status === 'completed') {
          clearInterval(pollInterval);

          const resultResponse = await fetch(`${API_BASE_URL}/api/audit/${auditId}/result`);
          const result = await resultResponse.json();

          setAuditState({
            status: 'completed',
            auditId,
            progress: data.progress || [],
            result,
            error: null
          });
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);

          setAuditState({
            status: 'error',
            auditId,
            progress: data.progress || [],
            result: null,
            error: data.error || 'Audit failed'
          });
        }
      } catch (error) {
        clearInterval(pollInterval);
        setAuditState(prev => ({
          ...prev,
          status: 'error',
          error: error.message
        }));
      }
    }, 1000);
  };

  const resetAudit = () => {
    setAuditState({
      status: 'idle',
      auditId: null,
      progress: [],
      result: null,
      error: null
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-5xl font-extrabold bg-gradient-to-r from-white via-emerald-100 to-green-200 bg-clip-text text-transparent">
                Verisite
              </h1>
              <p className="text-emerald-200 text-sm font-medium mt-1">
                Professional Website Auditing Tool
              </p>
            </div>
          </div>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            Crawl and analyze your website with deterministic precision for technical SEO issues.
            <span className="text-emerald-400 font-medium"> AI-powered insights</span> help detect intent mismatches and soft 404s.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {auditState.status === 'idle' && (
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <AuditForm onSubmit={startAudit} isLoading={false} />
            </div>
          )}

          {(auditState.status === 'starting' || auditState.status === 'running') && (
            <>
              <AuditProgress progress={auditState.progress} />
              <div className="text-center">
                <button
                  onClick={resetAudit}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                >
                  Cancel Audit
                </button>
              </div>
            </>
          )}

          {auditState.status === 'completed' && auditState.result && (
            <>
              <AuditResults result={auditState.result} />
              <div className="text-center pt-4">
                <button
                  onClick={resetAudit}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  Start New Audit
                </button>
              </div>
            </>
          )}

          {auditState.status === 'error' && (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <span className="text-3xl text-white">⚠</span>
              </div>
              <div className="text-red-900 text-2xl font-bold mb-2">
                Audit Failed
              </div>
              <div className="text-red-700 mb-6 max-w-md mx-auto">
                {auditState.error}
              </div>
              <button
                onClick={resetAudit}
                className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 transition-all shadow-lg font-semibold"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <footer className="mt-16 pt-8 border-t border-slate-700/50 text-center space-y-2">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-emerald-400">Verisite</span> — Technical SEO auditing with precision crawling
          </p>
          <p className="text-xs text-slate-500">
            Deterministic analysis • AI-powered intent detection • Factual findings
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
