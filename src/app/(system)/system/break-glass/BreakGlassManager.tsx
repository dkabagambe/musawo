'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, Shield, Clock, FileText, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui';

interface BreakGlassRequest {
  id: string;
  reason: string;
  scope: string;
  scopeDetails: string;
  duration: number; // minutes
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'revoked';
  requestedAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  approvedBy: string | null;
  queriesCount: number;
}

const SCOPE_OPTIONS = [
  { value: 'one_record', label: 'One Record', description: 'Single student, payment, or exam record' },
  { value: 'one_table', label: 'One Table', description: 'All records in a specific table' },
  { value: 'user_data', label: 'User Data', description: 'All data for one user' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes (max)' },
];

export default function BreakGlassManager({ userId }: { userId: string }) {
  const [requests, setRequests] = useState<BreakGlassRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [reason, setReason] = useState('');
  const [scope, setScope] = useState('one_record');
  const [scopeDetails, setScopeDetails] = useState('');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/system/break-glass');
      const data = await response.json();
      setRequests(data.requests || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch break-glass requests:', error);
      setLoading(false);
    }
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/system/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          scope,
          scopeDetails: scopeDetails.trim(),
          duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setResult({
        type: 'success',
        message: 'Request submitted. Waiting for Director approval.',
      });

      // Reset form
      setReason('');
      setScopeDetails('');
      setShowForm(false);

      // Refresh list
      fetchRequests();
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit request',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revokeRequest = async (requestId: string) => {
    if (!confirm('Revoke this break-glass access?')) return;

    try {
      const response = await fetch(`/api/system/break-glass/${requestId}/revoke`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke request');
      }

      setResult({
        type: 'success',
        message: 'Access revoked successfully',
      });

      fetchRequests();
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to revoke',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Active</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'expired':
        return <Badge variant="default">Expired</Badge>;
      case 'revoked':
        return <Badge variant="default">Revoked</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    return `${minutes}m remaining`;
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

  // Check if there's an active approved request
  const activeRequest = requests.find(
    (r) => r.status === 'approved' && r.expiresAt && new Date(r.expiresAt) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold mb-1">Emergency Access Only</p>
          <p>
            Break-glass access grants temporary read-only access to business data for troubleshooting.
            All access requires Director approval with 2FA re-authentication. Every query is logged
            and shown to the Director afterwards.
          </p>
        </div>
      </div>

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

      {/* Active Access Alert */}
      {activeRequest && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Access Granted</p>
              <p className="text-sm text-green-800 mt-1">
                You have active break-glass access. Scope: <strong>{activeRequest.scope.replace('_', ' ')}</strong>
                {' - '}{activeRequest.scopeDetails}
              </p>
              <p className="text-sm text-green-700 mt-2">
                <Clock className="inline h-4 w-4 mr-1" />
                {getTimeRemaining(activeRequest.expiresAt!)}
              </p>
              <button
                onClick={() => revokeRequest(activeRequest.id)}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Revoke Access Early
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Form */}
      {!activeRequest && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">New Break-glass Request</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showForm ? 'Cancel' : 'New Request'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submitRequest} className="space-y-4">
              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">
                  Reason for Access <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you need access to business data..."
                  rows={3}
                  maxLength={500}
                  required
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 characters. Be specific about the issue you're troubleshooting.
                </p>
              </div>

              {/* Scope */}
              <div>
                <label htmlFor="scope" className="block text-sm font-medium mb-1">
                  Access Scope <span className="text-red-600">*</span>
                </label>
                <select
                  id="scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="input w-full"
                  required
                >
                  {SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope Details */}
              <div>
                <label htmlFor="scopeDetails" className="block text-sm font-medium mb-1">
                  Scope Details <span className="text-red-600">*</span>
                </label>
                <input
                  id="scopeDetails"
                  type="text"
                  value={scopeDetails}
                  onChange={(e) => setScopeDetails(e.target.value)}
                  placeholder={
                    scope === 'one_record'
                      ? 'e.g., Student ID: 2026/MHC/005'
                      : scope === 'one_table'
                      ? 'e.g., Table: payments'
                      : 'e.g., User email: student@example.com'
                  }
                  maxLength={200}
                  required
                  className="input w-full"
                />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium mb-1">
                  Duration <span className="text-red-600">*</span>
                </label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="input w-full"
                  required
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 60 minutes. Access expires automatically.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  <strong>Important:</strong> The Director will be notified immediately and must approve with 2FA.
                  All queries you make will be logged and reviewed by the Director.
                </p>
              </div>

              {/* Submit */}
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Submitting Request...
                  </>
                ) : (
                  'Submit Request to Director'
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Request History */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Request History</h3>

        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No break-glass requests yet
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(request.status)}
                      <span className="text-xs text-gray-500">
                        {new Date(request.requestedAt).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{request.reason}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Scope: {request.scope.replace('_', ' ')} - {request.scopeDetails}
                    </p>
                    <p className="text-xs text-gray-600">
                      Duration: {request.duration} minutes
                    </p>
                  </div>
                </div>

                {request.approvedBy && (
                  <div className="text-xs text-gray-600 mt-2 pt-2 border-t">
                    {request.status === 'approved' && (
                      <>
                        Approved by {request.approvedBy} at{' '}
                        {new Date(request.approvedAt!).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                        {request.expiresAt && new Date(request.expiresAt) > new Date() && (
                          <span className="ml-2 text-amber-600 font-medium">
                            ({getTimeRemaining(request.expiresAt)})
                          </span>
                        )}
                        <br />
                        Queries executed: {request.queriesCount}
                      </>
                    )}
                    {request.status === 'rejected' && (
                      <span className="text-red-600">
                        Rejected by {request.approvedBy} at{' '}
                        {new Date(request.approvedAt!).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
