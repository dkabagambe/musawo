'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle, Unlock, Mail, LogOut, Ban, Shield } from 'lucide-react';
import { Badge } from '@/components/ui';
import { useSearchParams } from 'next/navigation';

interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLogin: string | null;
  twoFactorEnabled: boolean;
  locked: boolean;
  activeSessions: number;
}

export default function AccountSupportManager() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('query') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-search if query param is present
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearching(true);
    setNotFound(false);
    setAccount(null);
    setResult(null);

    try {
      const response = await fetch(`/api/system/accounts/lookup?query=${encodeURIComponent(query.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
        } else {
          throw new Error(data.error || 'Search failed');
        }
      } else {
        setAccount(data);
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Search failed',
      });
    } finally {
      setSearching(false);
    }
  };

  const searchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const performAction = async (action: string, accountId: string) => {
    setActionInProgress(action);
    setResult(null);

    try {
      const response = await fetch('/api/system/accounts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, accountId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setResult({
        type: 'success',
        message: data.message,
      });

      // Refresh account data
      if (account) {
        const refreshResponse = await fetch(`/api/system/accounts/lookup?query=${encodeURIComponent(account.email)}`);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setAccount(refreshedData);
        }
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Action failed',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'DIRECTOR' || role === 'PRINCIPAL') return 'danger';
    if (role === 'SYSTEM_IT' || role === 'ADMIN') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="card">
        <form onSubmit={searchUser} className="space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium mb-2">
              Search by Name or Email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name or email..."
                  className="input w-full pl-10"
                  disabled={searching}
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="btn-primary"
              >
                {searching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                    Searching...
                  </>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Result Messages */}
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

      {notFound && (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No user found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try searching by full email or exact name
            </p>
          </div>
        </div>
      )}

      {/* Account Details */}
      {account && (
        <div className="space-y-4">
          {/* User Info Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{account.name}</h3>
                <p className="text-sm text-gray-500 font-mono mt-1">{account.email}</p>
              </div>
              <Badge variant={getRoleBadgeVariant(account.role)}>
                {account.role.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium mt-1">
                  {account.status === 'ACTIVE' ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">{account.status}</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Last Login</p>
                <p className="text-sm font-medium mt-1">
                  {account.lastLogin
                    ? new Date(account.lastLogin).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : 'Never'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">2FA Status</p>
                <p className="text-sm font-medium mt-1">
                  {account.twoFactorEnabled ? (
                    <span className="text-green-600">Enabled</span>
                  ) : (
                    <span className="text-gray-400">Not enrolled</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Account Locked</p>
                <p className="text-sm font-medium mt-1">
                  {account.locked ? (
                    <span className="text-red-600">Yes</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Active Sessions</p>
                <p className="text-sm font-medium mt-1">{account.activeSessions}</p>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          <div className="card">
            <h4 className="font-semibold mb-4">Account Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Unlock Account */}
              {account.locked && (
                <button
                  onClick={() => performAction('unlock', account.id)}
                  disabled={actionInProgress !== null}
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  {actionInProgress === 'unlock' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                  Unlock Account
                </button>
              )}

              {/* Send Password Reset */}
              <button
                onClick={() => performAction('password-reset', account.id)}
                disabled={actionInProgress !== null}
                className="btn-outline flex items-center justify-center gap-2"
              >
                {actionInProgress === 'password-reset' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Password Reset
              </button>

              {/* Force Sign Out */}
              {account.activeSessions > 0 && (
                <button
                  onClick={() => performAction('force-signout', account.id)}
                  disabled={actionInProgress !== null}
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  {actionInProgress === 'force-signout' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Force Sign Out All
                </button>
              )}

              {/* Emergency Disable */}
              {account.status === 'ACTIVE' && (
                <button
                  onClick={() => {
                    if (confirm(`Emergency disable ${account.name}? Principal and Director will be notified.`)) {
                      performAction('emergency-disable', account.id);
                    }
                  }}
                  disabled={actionInProgress !== null}
                  className="btn-outline flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  {actionInProgress === 'emergency-disable' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Emergency Disable
                </button>
              )}
            </div>

            {/* Privileged Account Warning */}
            {(account.role === 'DIRECTOR' || account.role === 'PRINCIPAL') && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 flex gap-2">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <strong>Privileged Account:</strong> 2FA resets for Directors and Principals must be done by the Director.
                  Account recovery follows the documented procedure with a second approver.
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              All actions are audit logged and rate limited. The user will be notified.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
