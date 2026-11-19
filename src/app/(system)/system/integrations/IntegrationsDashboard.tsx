"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Loader2, Play, RefreshCw, XCircle } from "lucide-react";

type Integration = {
  id: string;
  name: string;
  status: "configured" | "missing" | "working" | "failing";
  lastCheck: string | null;
  error: string | null;
  testable: boolean;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  configured: <CheckCircle className="w-5 h-5 text-blue-500" />,
  missing: <XCircle className="w-5 h-5 text-gray-400" />,
  working: <CheckCircle className="w-5 h-5 text-green-500" />,
  failing: <AlertTriangle className="w-5 h-5 text-red-500" />,
};

const STATUS_BG: Record<string, string> = {
  configured: "border-blue-200 bg-blue-50",
  missing: "border-gray-200 bg-gray-50",
  working: "border-green-200 bg-green-50",
  failing: "border-red-200 bg-red-50",
};

export default function IntegrationsDashboard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/system/integrations", { cache: "no-store" });
      setIntegrations((await res.json()) as Integration[]);
    } finally {
      setLoading(false);
    }
  }

  async function test(id: string) {
    setTesting(id);
    try {
      await fetch(`/api/system/integrations/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integration: id }),
      });
      await load();
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading integrations...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => void load()} className="btn-ghost text-sm inline-flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className={`card border-2 ${STATUS_BG[integration.status]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {STATUS_ICON[integration.status]}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{integration.name}</h3>
                  <p className="text-xs capitalize text-gray-600 mt-1">{integration.status}</p>
                  {integration.lastCheck && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last check: {new Date(integration.lastCheck).toLocaleString("en-UG")}
                    </p>
                  )}
                  {integration.error && (
                    <p className="text-xs text-red-600 mt-2 font-mono">{integration.error}</p>
                  )}
                </div>
              </div>
              {integration.testable && (
                <button
                  onClick={() => void test(integration.id)}
                  disabled={testing === integration.id}
                  className="btn-ghost text-xs inline-flex items-center gap-1"
                >
                  {testing === integration.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  Test
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card border-blue-200 bg-blue-50">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Secrets and API keys are never displayed. Test buttons verify connectivity without exposing credentials.
        </p>
      </div>
    </div>
  );
}
