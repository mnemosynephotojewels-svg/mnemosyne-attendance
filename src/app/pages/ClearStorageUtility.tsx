import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function ClearStorageUtility() {
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [clearedItems, setClearedItems] = useState<string[]>([]);
  const [storageStats, setStorageStats] = useState<{ key: string; size: number; valid: boolean }[]>([]);

  // Scan localStorage for all Mnemosyne-related items
  const scanLocalStorage = () => {
    const items: { key: string; size: number; valid: boolean }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        
        // Check if it's valid JSON
        let valid = true;
        if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
          try {
            JSON.parse(value);
          } catch (e) {
            valid = false;
          }
        }
        
        items.push({ key, size, valid });
      }
    }
    
    // Sort by size (largest first)
    items.sort((a, b) => b.size - a.size);
    setStorageStats(items);
  };

  // Clear all corrupted localStorage items
  const clearCorruptedData = () => {
    setIsClearing(true);
    const cleared: string[] = [];
    
    try {
      console.log('🗑️ [ClearStorage] Starting corrupted data cleanup...');
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          
          // Check if it's supposed to be JSON but is corrupted
          if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
            try {
              JSON.parse(value);
            } catch (e) {
              console.log(`❌ [ClearStorage] Found corrupted data in key: ${key}`);
              console.log(`   Raw data (first 100 chars):`, value.substring(0, 100));
              localStorage.removeItem(key);
              cleared.push(key);
            }
          }
        }
      }
      
      setClearedItems(cleared);
      
      if (cleared.length === 0) {
        toast.success('✅ No corrupted data found!');
        console.log('✅ [ClearStorage] No corrupted data found');
      } else {
        toast.success(`✅ Cleared ${cleared.length} corrupted item(s)!`);
        console.log(`✅ [ClearStorage] Cleared ${cleared.length} corrupted items:`, cleared);
      }
      
      // Re-scan after clearing
      scanLocalStorage();
    } catch (error: any) {
      console.error('❌ [ClearStorage] Error during cleanup:', error);
      toast.error('❌ Error: ' + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Clear ALL localStorage (nuclear option)
  const clearAllData = () => {
    if (confirm('⚠️ WARNING: This will clear ALL localStorage data including saved sessions. You will be logged out. Continue?')) {
      setIsClearing(true);
      try {
        const allKeys = Object.keys(localStorage);
        localStorage.clear();
        setClearedItems(allKeys);
        toast.success(`✅ Cleared all ${allKeys.length} items from localStorage!`);
        console.log('✅ [ClearStorage] Cleared all localStorage data');
        
        // Re-scan
        setTimeout(() => {
          scanLocalStorage();
          setIsClearing(false);
        }, 500);
      } catch (error: any) {
        console.error('❌ [ClearStorage] Error clearing all data:', error);
        toast.error('❌ Error: ' + error.message);
        setIsClearing(false);
      }
    }
  };

  // Initial scan on mount
  useState(() => {
    scanLocalStorage();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Login</span>
          </button>
          
          <div className="flex items-center gap-3">
            <Trash2 className="w-10 h-10" />
            <div>
              <h1 className="text-3xl font-bold">Storage Cleanup Utility</h1>
              <p className="text-white/90 mt-1">
                Clear corrupted localStorage data and fix JSON parsing errors
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-semibold mb-1">⚠️ When to Use This Tool:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>You see "Unexpected non-whitespace character after JSON" errors</li>
                <li>The app won't load or crashes on certain pages</li>
                <li>You're experiencing persistent localStorage errors</li>
              </ul>
            </div>
          </div>

          {/* Storage Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                localStorage Analysis
              </h2>
              <button
                onClick={scanLocalStorage}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Re-scan
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {storageStats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items in localStorage</p>
              ) : (
                storageStats.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-2 ${
                      item.valid
                        ? 'bg-white border-gray-200'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                          <code className="text-sm font-mono text-gray-800 truncate">
                            {item.key}
                          </code>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {item.valid ? '✅ Valid JSON' : '❌ CORRUPTED JSON'} • {(item.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clear Corrupted Only */}
            <button
              onClick={clearCorruptedData}
              disabled={isClearing}
              className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  Clear Corrupted Data Only
                </>
              )}
            </button>

            {/* Clear All (Nuclear Option) */}
            <button
              onClick={clearAllData}
              disabled={isClearing}
              className="px-6 py-4 bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg border-2 border-red-300"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5" />
                  CLEAR ALL DATA (⚠️ DANGER)
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {clearedItems.length > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                ✅ Cleared {clearedItems.length} Item(s)
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {clearedItems.map((key, idx) => (
                  <code key={idx} className="block text-sm text-green-800 bg-green-100 px-2 py-1 rounded">
                    {key}
                  </code>
                ))}
              </div>
              <p className="text-sm text-green-700 mt-3">
                💡 <strong>Next step:</strong> Go back to the login page and try logging in again!
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <h3 className="font-bold text-blue-900 mb-2">📖 How to Use:</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-blue-800">
              <li>Click <strong>"Re-scan"</strong> to check for corrupted data (items marked with ❌)</li>
              <li>Click <strong>"Clear Corrupted Data Only"</strong> to remove invalid JSON (recommended)</li>
              <li>If issues persist, use <strong>"CLEAR ALL DATA"</strong> (this will log you out)</li>
              <li>After clearing, return to the login page and sign in again</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
