'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui';

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  productionSafe: boolean;
  lastChangedBy: string | null;
  lastChangedAt: string | null;
}

export default function FeatureFlagsManager({ userId }: { userId: string }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [appEnv, setAppEnv] = useState<string>('development');

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const response = await fetch('/api/system/feature-flags');
      const data = await response.json();
      setFlags(data.flags || []);
      setAppEnv(data.appEnv || 'development');
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch flags:', error);
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, currentValue: boolean) => {
    setUpdating(flagKey);
    setResult(null);

    try {
      const response = await fetch('/api/system/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: flagKey,
          enabled: !currentValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update feature flag');
      }

      // Update local state
      setFlags(prev => prev.map(f => 
        f.key === flagKey 
          ? { ...f, enabled: data.enabled, lastChangedBy: data.lastChangedBy, lastChangedAt: data.lastChangedAt }
          : f
      ));

      setResult({
        type: 'success',
        message: `${data.name} ${data.enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update flag',
      });
    } finally {
      setUpdating(null);
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
      {/* Environment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>Current Environment:</strong> {appEnv.toUpperCase()}
          {appEnv === 'production' && (
            <span className="ml-2 text-amber-600">
              - Production-unsafe flags are blocked
            </span>
          )}
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

      {/* Feature Flags */}
      <div className="grid gap-4">
        {flags.map((flag) => {
          const isProduction = appEnv === 'production';
          const cannotEnable = !flag.productionSafe && isProduction && !flag.enabled;
          
          return (
            <div key={flag.key} className="card">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{flag.name}</h3>
                    {!flag.productionSafe && (
                      <Badge variant="danger" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Production-Unsafe
                      </Badge>
                    )}
                    <Badge variant={flag.enabled ? 'success' : 'default'} className="text-xs">
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{flag.description}</p>
                  {flag.lastChangedBy && (
                    <p className="text-xs text-gray-400 pt-1">
                      Last changed by {flag.lastChangedBy} at{' '}
                      {new Date(flag.lastChangedAt!).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => toggleFlag(flag.key, flag.enabled)}
                      disabled={updating === flag.key || cannotEnable}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                  {updating === flag.key && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
              </div>
              {cannotEnable && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">
                    This flag cannot be enabled in production environment
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {flags.length === 0 && (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No feature flags configured</p>
          </div>
        </div>
      )}
    </div>
  );
}
