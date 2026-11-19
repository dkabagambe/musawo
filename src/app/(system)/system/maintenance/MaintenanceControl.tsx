'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';

interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  expectedEnd: string | null;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
}

export default function MaintenanceControl({ userId }: { userId: string }) {
  const [status, setStatus] = useState<MaintenanceStatus>({
    enabled: false,
    message: null,
    expectedEnd: null,
    lastChangedBy: null,
    lastChangedAt: null,
  });
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current status
  useEffect(() => {
    fetch('/api/system/maintenance')
      .then(res => res.json())
      .then(data => {
        setStatus(data);
        setEnabled(data.enabled);
        setMessage(data.message || 'System maintenance in progress. We will be back shortly.');
        setExpectedEnd(data.expectedEnd || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          message: message.trim() || null,
          expectedEnd: expectedEnd.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update maintenance mode');
      }

      setStatus(data);
      setResult({
        type: 'success',
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setSubmitting(false);
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
      {/* Current Status */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {status.enabled ? (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Current Status
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Maintenance Mode:</span>
            <span className={status.enabled ? 'text-amber-600 font-semibold' : 'text-green-600'}>
              {status.enabled ? 'ACTIVE' : 'Normal Operation'}
            </span>
          </div>

          {status.enabled && (
            <>
              {status.message && (
                <div>
                  <span className="text-sm font-medium">Message:</span>
                  <p className="mt-1 text-sm text-gray-500">{status.message}</p>
                </div>
              )}
              {status.expectedEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Expected End:</span>
                  <span className="text-gray-500">
                    {new Date(status.expectedEnd).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
            </>
          )}

          {status.lastChangedBy && (
            <div className="text-xs text-gray-400 border-t pt-3">
              Last changed by {status.lastChangedBy} at{' '}
              {new Date(status.lastChangedAt!).toLocaleString('en-GB', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </div>
          )}
        </div>
      </div>

      {/* Control Form */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Maintenance Mode Control</h2>
          <p className="text-sm text-gray-500 mt-1">
            When enabled, students and instructors will see a maintenance page. Director, Principal, Admin and IT Admin can still log in.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Switch */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label htmlFor="enabled" className="text-base font-medium">
                Enable Maintenance Mode
              </label>
              <p className="text-sm text-gray-500">
                Blocks access for students and instructors
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="message" className="block text-sm font-medium">
              Maintenance Message
              <span className="text-gray-500 font-normal ml-2">(shown to blocked users)</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="System maintenance in progress. We will be back shortly."
              rows={3}
              maxLength={500}
              className="input w-full"
            />
            <p className="text-xs text-gray-500">
              {message.length}/500 characters
            </p>
          </div>

          {/* Expected End Time */}
          <div className="space-y-2">
            <label htmlFor="expectedEnd" className="block text-sm font-medium">
              Expected End Time
              <span className="text-gray-500 font-normal ml-2">(optional, in UTC)</span>
            </label>
            <input
              id="expectedEnd"
              type="datetime-local"
              value={expectedEnd}
              onChange={(e) => setExpectedEnd(e.target.value)}
              placeholder="2026-11-20T03:00"
              className="input w-full"
            />
            <p className="text-xs text-gray-500">
              Leave empty if end time is uncertain
            </p>
          </div>

          {/* Impact Warning */}
          {enabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Impact:</strong> Students and instructors will be blocked from accessing the system.
                Director, Principal, Admin and IT Admin can still log in. Health checks will remain green.
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

          {/* Submit Button */}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Updating...
              </>
            ) : (
              'Update Maintenance Mode'
            )}
          </button>
        </form>
      </div>

      {/* Privileged Roles Info */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Roles With Maintenance Access</h3>
        <ul className="text-sm space-y-1 text-gray-500">
          <li>• Director</li>
          <li>• Principal</li>
          <li>• Admin</li>
          <li>• IT Admin</li>
        </ul>
        <p className="mt-3 text-xs text-gray-400">
          These roles can log in and access the system even when maintenance mode is active.
        </p>
      </div>
    </div>
  );
}
