import React, { useState } from 'react';
import { Card } from '../components/Card';
import { QrCode, Zap, CheckCircle, AlertCircle, Loader2, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { Link } from 'react-router';

interface QRGenerationResult {
  admin_number: string;
  full_name?: string;
  department?: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
  qr_data?: string;
}

interface GenerationSummary {
  total: number;
  generated: number;
  skipped: number;
  errors: number;
}

export function GenerateAdminQRCodes() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<GenerationSummary | null>(null);
  const [results, setResults] = useState<QRGenerationResult[]>([]);

  const generateQRCodes = async () => {
    setIsGenerating(true);
    setSummary(null);
    setResults([]);

    try {
      console.log('🚀 Starting QR code generation for all admins...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/generate-admin-qr-codes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      console.log('📊 Generation response:', data);

      if (!response.ok || !data.success) {
        // Check if error is about missing column
        if (data.error && data.error.includes('qr_code_data does not exist')) {
          toast.error('Database column missing! Click the button below to set it up.', { duration: 8000 });
          throw new Error('COLUMN_MISSING');
        }
        throw new Error(data.error || 'Failed to generate QR codes');
      }

      setSummary(data.summary);
      setResults(data.results);

      if (data.summary.generated > 0) {
        toast.success(`✅ Generated ${data.summary.generated} QR code${data.summary.generated !== 1 ? 's' : ''}!`);
      } else if (data.summary.skipped > 0) {
        toast.info(`All ${data.summary.skipped} admin accounts already have QR codes!`);
      }

      if (data.summary.errors > 0) {
        toast.warning(`⚠️ ${data.summary.errors} error${data.summary.errors !== 1 ? 's' : ''} occurred`);
      }

    } catch (error: any) {
      console.error('❌ Error generating QR codes:', error);
      toast.error(`Failed to generate QR codes: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">Generate Admin QR Codes</h1>
            <p className="text-sm text-[#6B7280]">Create unique QR codes for all team leader admin accounts</p>
          </div>
        </div>
      </div>

      {/* Setup Warning Banner */}
      <Card>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-orange-900 mb-1">⚠️ First Time Setup Required</h3>
              <p className="text-sm text-orange-800 mb-3">
                Before generating QR codes, make sure the <code className="bg-orange-200 px-1 rounded">qr_code_data</code> column exists in your database.
              </p>
              <Link
                to="/super-admin/setup-admin-qr-column"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                <Database className="w-4 h-4" />
                Setup Database Column
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-[#F7B34C] rounded-full flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#1F2937] mb-2">Automatic QR Code Generation</h2>
            <p className="text-sm text-[#6B7280] mb-4">
              This tool automatically generates unique QR codes for all team leader admin accounts in your system. 
              Each QR code contains the admin's unique identifier, name, and department information.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[#0B3060] mb-2">What this does:</h3>
              <ul className="text-sm text-[#1F2937] space-y-1 list-disc list-inside">
                <li>Scans all admin accounts in the database</li>
                <li>Generates unique QR code data for each admin</li>
                <li>Stores QR codes in the <code className="bg-blue-200 px-1 rounded">qr_code_data</code> field</li>
                <li>Skips admins who already have QR codes</li>
                <li>Each admin can then view and download their QR code from Settings</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <Card>
        <div className="text-center py-8">
          <button
            onClick={generateQRCodes}
            disabled={isGenerating}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating QR Codes...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                Generate QR Codes for All Admins
              </>
            )}
          </button>
          <p className="text-sm text-[#6B7280] mt-4">
            {isGenerating 
              ? 'Please wait while we generate unique QR codes...'
              : 'Click to automatically generate QR codes for all admin accounts'
            }
          </p>
        </div>
      </Card>

      {/* Summary Results */}
      {summary && (
        <Card>
          <h2 className="text-xl font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Generation Summary
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-[#0B3060]">{summary.total}</p>
              <p className="text-sm text-[#6B7280] mt-1">Total Admins</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{summary.generated}</p>
              <p className="text-sm text-[#6B7280] mt-1">Generated</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{summary.skipped}</p>
              <p className="text-sm text-[#6B7280] mt-1">Skipped</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-sm text-[#6B7280] mt-1">Errors</p>
            </div>
          </div>

          {/* Detailed Results */}
          {results.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#1F2937] mb-3">Detailed Results</h3>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Admin Number</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Full Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#1F2937]">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-[#0B3060]">
                          {result.admin_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#1F2937]">
                          {result.full_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6B7280]">
                          {result.department || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {result.status === 'success' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Success
                            </span>
                          )}
                          {result.status === 'skipped' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              <RefreshCw className="w-3 h-3" />
                              Skipped
                            </span>
                          )}
                          {result.status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#6B7280]">
                          {result.reason || 'QR code generated successfully'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Next Steps */}
      {summary && summary.generated > 0 && (
        <Card>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              ✅ QR Codes Generated Successfully!
            </h3>
            <div className="space-y-2 text-sm text-green-800">
              <p className="font-medium">Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Each admin can now log in to their account</li>
                <li>Navigate to <strong>Settings → My QR Code</strong></li>
                <li>Download and save their unique QR code</li>
                <li>Use the QR code for kiosk mode attendance tracking</li>
                <li>The QR code is permanently stored and doesn't need regeneration</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}