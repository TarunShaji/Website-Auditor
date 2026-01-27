import React, { useState } from 'react';
import { AuditForm } from './components/AuditForm';
import { AuditProgress } from './components/AuditProgress';
import { AuditResults } from './components/AuditResults';
import { Shield } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  const [auditState, setAuditState] = useState({
    status: 'idle',
    auditId: null,
    progress: [],
    result: null,
    error: null
  });

  const startAudit = async ({ url, maxPages, maxDepth }) => {
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
        body: JSON.stringify({ url, maxPages, maxDepth }),
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Verisite</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Deterministic Website Auditing Tool
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Crawl, analyze, and detect objective technical issues
          </p>
        </header>

        <div className="space-y-6">
          {auditState.status === 'idle' && (
            <AuditForm onSubmit={startAudit} isLoading={false} />
          )}

          {(auditState.status === 'starting' || auditState.status === 'running') && (
            <>
              <AuditProgress progress={auditState.progress} />
              <div className="text-center">
                <button
                  onClick={resetAudit}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel Audit
                </button>
              </div>
            </>
          )}

          {auditState.status === 'completed' && auditState.result && (
            <>
              <AuditResults result={auditState.result} />
              <div className="text-center">
                <button
                  onClick={resetAudit}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Start New Audit
                </button>
              </div>
            </>
          )}

          {auditState.status === 'error' && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <div className="text-destructive text-xl font-semibold mb-2">
                Audit Failed
              </div>
              <div className="text-muted-foreground mb-4">
                {auditState.error}
              </div>
              <button
                onClick={resetAudit}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <footer className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            Verisite performs deterministic analysis only. No AI, no inference, no qualitative judgments.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
