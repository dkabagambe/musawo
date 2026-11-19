'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Shield, ExternalLink, RefreshCw, Download } from 'lucide-react';
import { Badge } from '@/components/ui';
import Link from 'next/link';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string;
  userAgent: string | null;
  description: string;
  metadata: any;
  createdAt: string;
}

interface Filters {
  type: string;
  severity: string;
  role: string;
  timeRange: string;
  search: string;
}

const EVENT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'failed_login', label: 'Failed Login' },
  { value: 'account_locked', label: 'Account Locked' },
  { value: 'rate_limit_hit', label: 'Rate Limit Hit' },
  { value: 'new_device_login', label: 'New Device Login' },
  { value: 'totp_failed', label: '2FA Failed' },
  { value: 'totp_success', label: '2FA Success' },
  { value: 'suspicious_pattern', label: 'Suspicious Pattern' },
  { value: 'password_reset_requested', label: 'Password Reset' },
];

const SEVERITY_LEVELS = [
  { value: '', label: 'All Severity' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

export default function SecurityEventsViewer() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    type: '',
    severity: '',
    role: '',
    timeRange: '24h',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [filters.type, filters.severity, filters.role, filters.timeRange]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.role) params.append('role', filters.role);
      if (filters.timeRange) params.append('timeRange', filters.timeRange);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/system/security-events?${params.toString()}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const exportEvents = () => {
    // Convert to CSV
    const headers = ['Timestamp', 'Type', 'Severity', 'User', 'IP Address', 'Description'];
    const rows = events.map(event => [
      new Date(event.createdAt).toISOString(),
      event.type,
      event.severity,
      event.userName || event.userEmail || 'N/A',
      event.ipAddress,
      event.description,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-events-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          <div className="flex gap-2">
            <button onClick={fetchEvents} className="btn-outline text-sm">
              <RefreshCw className="h-4 w-4 mr-2 inline" />
              Refresh
            </button>
            <button onClick={exportEvents} className="btn-outline text-sm" disabled={events.length === 0}>
              <Download className="h-4 w-4 mr-2 inline" />
              Export CSV
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="type" className="block text-xs font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <select
                  id="type"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="input text-sm w-full"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="severity" className="block text-xs font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  id="severity"
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="input text-sm w-full"
                >
                  {SEVERITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="role" className="block text-xs font-medium text-gray-700 mb-1">
                  User Role
                </label>
                <select
                  id="role"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="input text-sm w-full"
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="DIRECTOR">Director</option>
                  <option value="SYSTEM_IT">IT Admin</option>
                </select>
              </div>

              <div>
                <label htmlFor="timeRange" className="block text-xs font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  id="timeRange"
                  value={filters.timeRange}
                  onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                  className="input text-sm w-full"
                >
                  {TIME_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search by user, email, or IP address..."
                  className="input w-full pl-10 text-sm"
                />
              </div>
              <button type="submit" className="btn-primary text-sm">
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Events List */}
      {loading ? (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No security events found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your filters or time range
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`card border-l-4 ${getSeverityColor(event.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getSeverityBadgeVariant(event.severity)} className="text-xs">
                      {event.severity.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(event.createdAt).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                    {event.userRole && (
                      <Badge variant="default" className="text-xs">
                        {event.userRole}
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm font-medium mb-1">{event.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-gray-600">
                    {event.userName && (
                      <div>
                        <span className="font-medium">User:</span> {event.userName}
                      </div>
                    )}
                    {event.userEmail && (
                      <div>
                        <span className="font-medium">Email:</span> {event.userEmail}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">IP:</span> {event.ipAddress}
                    </div>
                  </div>

                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        Show details
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                {event.userEmail && (
                  <Link
                    href={`/system/accounts?query=${encodeURIComponent(event.userEmail)}`}
                    className="btn-outline text-xs flex items-center gap-1 ml-4"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Account
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && events.length > 0 && (
        <div className="card bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
              <p className="text-xs text-gray-600">Total Events</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {events.filter((e) => e.severity === 'critical' || e.severity === 'high').length}
              </p>
              <p className="text-xs text-gray-600">High/Critical</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {new Set(events.map((e) => e.ipAddress)).size}
              </p>
              <p className="text-xs text-gray-600">Unique IPs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(events.filter((e) => e.userEmail).map((e) => e.userEmail)).size}
              </p>
              <p className="text-xs text-gray-600">Unique Users</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
