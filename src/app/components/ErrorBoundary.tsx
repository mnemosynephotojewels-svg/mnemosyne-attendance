import React from 'react';
import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred';
  let errorDetails = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || errorMessage;
    errorDetails = error.data || '';
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  }

  console.error('Route Error:', error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4d8f] to-[#0B3060] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#1F2937] mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-[#6B7280] mb-4">
              {errorMessage}
            </p>
            {errorDetails && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-[#6B7280] hover:text-[#0B3060]">
                  View technical details
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-64">
                  {errorDetails}
                </pre>
              </details>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-[#1F2937] rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold"
          >
            <Home className="w-5 h-5" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
