'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Mail, MessageSquare, RefreshCw, Eye } from 'lucide-react';
import { Badge } from '@/components/ui';

interface QueueStats {
  email: {
    sent: number;
    queued: number;
    failed: number;
    bounces: number;
    complaints: number;
  };
  sms: {
    sent: number;
    queued: number;
    failed: number;
  };
  demoMode: boolean;
}

interface FailedMessage {
  id: string;
  type: 'email' | 'sms';
  recipient: string; // masked
  subject?: string;
  error: string;
  attempts: number;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
}

export default function EmailSmsQueueManager() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'failed' | 'templates'>('failed');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, failedRes, templatesRes] = await Promise.all([
        fetch('/api/system/email-sms-queue/stats'),
        fetch('/api/system/email-sms-queue/failed'),
        fetch('/api/system/email-sms-queue/templates'),
      ]);

      const [statsData, failedData, templatesData] = await Promise.all([
        statsRes.json(),
        failedRes.json(),
        templatesRes.json(),
      ]);

      setStats(statsData);
      setFailedMessages(failedData.messages || []);
      setTemplates(templatesData.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
      setLoading(false);
    }
  };

  const retryMessage = async (messageId: string) => {
    setRetrying(messageId);
    setResult(null);

    try {
      const response = await fetch('/api/system/email-sms-queue/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry message');
      }

      setResult({ type: 'success', message: 'Message queued for retry' });
      fetchData(); // Refresh data
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to retry',
      });
    } finally {
      setRetrying(null);
    }
  };

  const retryAllFailed = async () => {
    setResult(null);

    try {
      const response = await fetch('/api/system/email-sms-queue/retry-all', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry messages');
      }

      setResult({
        type: 'success',
        message: `${data.count} messages queued for retry`,
      });
      fetchData(); // Refresh data
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to retry',
      });
    }
  };

  const sendTestEmail = async () => {
    setResult(null);

    try {
      const response = await fetch('/api/system/email-sms-queue/test-email', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setResult({ type: 'success', message: 'Test email sent to your address' });
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to send test',
      });
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {stats?.demoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Demo Mode:</strong> Email provider not configured. Messages are logged but not sent. Configure Resend API key in Settings &gt; Integrations.
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`rounded-lg p-4 flex gap-3 ${
          result.type === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          {result.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div className={`text-sm ${result.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
            {result.message}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Email Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Email Queue</h3>
            <Mail className="h-4 w-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Sent</p>
              <p className="text-2xl font-bold">{stats?.email.sent || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Queued</p>
              <p className="text-2xl font-bold">{stats?.email.queued || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats?.email.failed || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Bounces</p>
              <p className="text-2xl font-bold text-amber-600">{stats?.email.bounces || 0}</p>
            </div>
          </div>
          <div className="mt-4">
            <button onClick={sendTestEmail} className="btn-outline text-sm">
              <Mail className="mr-2 h-4 w-4 inline" />
              Send Test
            </button>
          </div>
        </div>

        {/* SMS Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">SMS Queue</h3>
            <MessageSquare className="h-4 w-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Sent</p>
              <p className="text-2xl font-bold">{stats?.sms.sent || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Queued</p>
              <p className="text-2xl font-bold">{stats?.sms.queued || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats?.sms.failed || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('failed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'failed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Failed Messages
            {failedMessages.length > 0 && (
              <Badge variant="danger" className="ml-2 text-xs">
                {failedMessages.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'failed' && (
        <div className="space-y-4">
          {failedMessages.length > 0 && (
            <div className="flex justify-end">
              <button onClick={retryAllFailed} className="btn-outline">
                <RefreshCw className="mr-2 h-4 w-4 inline" />
                Retry All Failed
              </button>
            </div>
          )}

          {failedMessages.length === 0 ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-gray-500">No failed messages</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {failedMessages.map((msg) => (
                <div key={msg.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          {msg.type === 'email' ? (
                            <Mail className="h-3 w-3" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          {msg.type.toUpperCase()}
                        </Badge>
                        <span className="font-mono text-sm text-gray-500">
                          {msg.recipient}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium">{msg.subject}</p>
                      )}
                      <p className="text-xs text-red-600">{msg.error}</p>
                      <p className="text-xs text-gray-400">
                        Attempts: {msg.attempts} | {new Date(msg.createdAt).toLocaleString('en-GB')}
                      </p>
                    </div>
                    <button
                      onClick={() => retryMessage(msg.id)}
                      disabled={retrying === msg.id}
                      className="btn-outline text-sm"
                    >
                      {retrying === msg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 inline" />
                          Retry
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No templates configured</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <div key={template.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold">{template.name}</h3>
                      <p className="text-xs font-mono text-gray-500">
                        {template.subject}
                      </p>
                      <p className="text-sm text-gray-500 pt-1">
                        {template.description}
                      </p>
                    </div>
                    <button className="btn-outline text-sm">
                      <Eye className="mr-2 h-4 w-4 inline" />
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
