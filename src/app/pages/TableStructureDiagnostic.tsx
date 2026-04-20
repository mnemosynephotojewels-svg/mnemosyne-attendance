import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function TableStructureDiagnostic() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  const checkTables = async () => {
    setLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('🔍 Fetching table structure...');
      console.log('API URL:', `${API_BASE_URL}/debug/table-structure`);
      console.log('Using public anon key for auth');

      const response = await fetch(`${API_BASE_URL}/debug/table-structure`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Failed to check tables`);
      }

      setResults(data);
      toast.success('Table structure loaded!');
    } catch (err: any) {
      console.error('❌ Error checking tables:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'An unexpected error occurred');
      toast.error('Failed to load table structure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTables();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'exception': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'exception': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default: return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
          <button
            onClick={checkTables}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Title */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#0B3060] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Database Table Structure Diagnostic
          </h1>
          <p className="text-gray-600">
            This tool checks your database tables and shows exactly what columns exist in each authentication table.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-bold text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Checking database tables...</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-6">
            {Object.entries(results.tables).map(([tableName, tableData]: [string, any]) => (
              <div key={tableName} className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
                {/* Table Header */}
                <div className={`p-6 ${getStatusColor(tableData.status)} bg-opacity-10 border-b-2 border-gray-200`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(tableData.status)}
                      <div>
                        <h2 className="text-2xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                          {tableName}
                        </h2>
                        <p className="text-sm text-gray-600">
                          Status: <span className="font-semibold capitalize">{tableData.status}</span>
                          {tableData.status === 'success' && ` • ${tableData.recordCount} records`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                <div className="p-6">
                  {tableData.status === 'success' ? (
                    <div className="space-y-4">
                      {/* Record Count */}
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <span className="font-semibold text-gray-700">Total Records:</span>
                        <span className="text-2xl font-bold text-[#0B3060]">{tableData.recordCount}</span>
                      </div>

                      {/* Columns */}
                      {tableData.columns && tableData.columns.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-[#0B3060] mb-3">Available Columns:</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {tableData.columns.map((col: string) => (
                              <div
                                key={col}
                                className="px-3 py-2 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-lg text-sm font-mono text-center shadow-md"
                              >
                                {col}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sample Data */}
                      {tableData.sampleData && (
                        <div>
                          <h3 className="text-lg font-bold text-[#0B3060] mb-3">Sample Record:</h3>
                          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-xs font-mono text-gray-700">
                              {JSON.stringify(tableData.sampleData, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* No Records Warning */}
                      {tableData.recordCount === 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            <div>
                              <h4 className="font-bold text-yellow-900">No Records Found</h4>
                              <p className="text-sm text-yellow-700">
                                This table exists but has no data. You need to create accounts first.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div className="flex-1">
                          <h4 className="font-bold text-red-900">Error Accessing Table</h4>
                          <p className="text-sm text-red-700 mt-1">
                            {tableData.error || 'Unknown error'}
                          </p>
                          {tableData.code && (
                            <p className="text-xs text-red-600 mt-2">
                              Error Code: {tableData.code}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm mb-1">Total Tables Checked</p>
                  <p className="text-3xl font-bold">{Object.keys(results.tables).length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm mb-1">Successful</p>
                  <p className="text-3xl font-bold text-green-300">
                    {Object.values(results.tables).filter((t: any) => t.status === 'success').length}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-white/80 text-sm mb-1">Errors</p>
                  <p className="text-3xl font-bold text-red-300">
                    {Object.values(results.tables).filter((t: any) => t.status !== 'success').length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-white/70 mt-4">
                Checked at: {new Date(results.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}