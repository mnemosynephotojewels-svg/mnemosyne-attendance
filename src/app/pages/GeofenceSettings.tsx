import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Card } from '../components/Card';
import { MapPin, Save, Loader, AlertCircle, Check, Globe, Navigation, Map as MapIcon, MousePointer, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  GeofenceConfig,
  getCurrentLocation,
  formatDistance,
  saveGeofenceToLocalStorage,
  loadGeofenceFromLocalStorage,
  calculateDistance,
} from '../../utils/geolocation';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

// Cache configuration
const CACHE_KEY = 'geofence_config_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

interface CachedConfig {
  data: GeofenceConfig;
  timestamp: number;
}

// Get cached config if still valid
function getCachedConfig(): GeofenceConfig | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedConfig = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;
      if (!isExpired) {
        console.log('✅ Using cached geofence config (fresh)');
        return parsed.data;
      } else {
        console.log('⏰ Cache expired, will fetch fresh data');
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to read cache:', error);
  }
  return null;
}

// Save config to cache
function setCachedConfig(config: GeofenceConfig): void {
  try {
    const cacheData: CachedConfig = {
      data: config,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('⚠️ Failed to cache config:', error);
  }
}

// Simple interactive map using iframe with vanilla JavaScript
function InteractiveMapPicker({
  latitude,
  longitude,
  radius,
  enabled,
  onLocationSelect,
}: {
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>('');

  // Handle geocode search
  const handleGeocodeSearch = async (query: string) => {
    try {
      console.log('🔍 [Geocode] Searching for:', query);
      
      const response = await fetch(`${API_BASE_URL}/geofence/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();
      
      console.log('✅ [Geocode] Results:', result);
      
      // Send results back to iframe
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          { type: 'GEOCODE_RESULTS', success: result.success, data: result.data || [] },
          '*'
        );
      }
    } catch (error) {
      console.error('❌ [Geocode] Error:', error);
      // Send error back to iframe
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          { type: 'GEOCODE_RESULTS', success: false, data: [] },
          '*'
        );
      }
    }
  };

  // Create blob URL once on mount
  useEffect(() => {
    const mapHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body,html{width:100%;height:100%;overflow:hidden;font-family:system-ui}#map{width:100%;height:100%;background:#aad3df}.search-box{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;width:90%;max-width:500px;background:#fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.15)}.search-input{width:100%;padding:12px;border:none;outline:none;font-size:14px}.search-results{max-height:300px;overflow-y:auto;display:none}.search-results.show{display:block}.result-item{padding:12px;border-top:1px solid #e5e7eb;cursor:pointer}.result-item:hover{background:#f3f4f6}.hint{position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:999;background:rgba(11,48,96,.95);color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;text-align:center;max-width:90%}.powered-by{position:absolute;bottom:10px;right:10px;z-index:999;background:rgba(255,255,255,.95);padding:4px 8px;border-radius:4px;font-size:10px;color:#666;box-shadow:0 2px 4px rgba(0,0,0,.1)}</style>
</head>
<body>
<div class="search-box"><input class="search-input" id="search" placeholder="Search using Google Maps quality data..." autocomplete="off"><div class="search-results" id="results"></div></div>
<div class="hint">💡 Search powered by Google Maps or click anywhere on map</div>
<div class="powered-by">🌐 Powered by Google Maps</div>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
let map,marker,circle,r=100;
const icon=L.icon({iconUrl:'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',shadowUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});
map=L.map('map').setView([14.5995,120.9842],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:19}).addTo(map);
function setLoc(lat,lng,rad){
if(marker)map.removeLayer(marker);
if(circle)map.removeLayer(circle);
r=rad||r;
marker=L.marker([lat,lng],{icon:icon}).addTo(map).bindPopup(\`<b>Selected</b><br>\${lat.toFixed(6)},\${lng.toFixed(6)}\`).openPopup();
circle=L.circle([lat,lng],{radius:r,color:'#22c55e',fillColor:'#22c55e',fillOpacity:0.2,weight:2}).addTo(map);
map.setView([lat,lng],Math.max(map.getZoom(),15));
window.parent.postMessage({type:'LOCATION_SELECTED',latitude:lat,longitude:lng},'*');
}
map.on('click',e=>{setLoc(e.latlng.lat,e.latlng.lng);document.getElementById('results').classList.remove('show')});
const inp=document.getElementById('search'),res=document.getElementById('results');
let to;
inp.addEventListener('input',e=>{
clearTimeout(to);
const q=e.target.value.trim();
if(q.length<3){res.classList.remove('show');return}
to=setTimeout(async()=>{
try{
res.innerHTML='<div style="padding:12px;text-align:center">🔍 Searching...</div>';
res.classList.add('show');
window.parent.postMessage({type:'GEOCODE_SEARCH',query:q},'*');
}catch(e){res.innerHTML='<div style="padding:12px;text-align:center;color:#666">Search failed</div>';}
},500);
});
window.addEventListener('message',e=>{
if(e.data.type==='SET_LOCATION'){
const{latitude,longitude,radius}=e.data;
if(latitude||longitude)setLoc(latitude,longitude,radius||r);
}else if(e.data.type==='UPDATE_RADIUS'&&circle&&marker){
const c=marker.getLatLng();
map.removeLayer(circle);
r=e.data.radius;
circle=L.circle([c.lat,c.lng],{radius:r,color:'#22c55e',fillColor:'#22c55e',fillOpacity:0.2,weight:2}).addTo(map);
}else if(e.data.type==='GEOCODE_RESULTS'){
const{success,data}=e.data;
if(success && data && data.length){
res.innerHTML=data.map((i,idx)=>\`<div class="result-item" data-lat="\${i.lat}" data-lon="\${i.lon}">📍 \${i.display_name}</div>\`).join('');
document.querySelectorAll('.result-item').forEach(el=>el.addEventListener('click',function(){
setLoc(parseFloat(this.getAttribute('data-lat')),parseFloat(this.getAttribute('data-lon')));
res.classList.remove('show');
inp.value='';
}));
}else{
res.innerHTML='<div style="padding:12px;text-align:center;color:#666">No results found</div>';
}
}
});
window.parent.postMessage({type:'MAP_READY'},'*');
setTimeout(()=>map.invalidateSize(),100);
</script>
</body>
</html>`;

    const blob = new Blob([mapHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);

  // Send API base URL to iframe once it's loaded
  useEffect(() => {
    if (mapReady && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'SET_API_BASE', apiBase: API_BASE_URL },
        '*'
      );
    }
  }, [mapReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOCATION_SELECTED') {
        onLocationSelect(event.data.latitude, event.data.longitude);
      } else if (event.data.type === 'MAP_READY') {
        setMapReady(true);
        if (latitude !== 0 || longitude !== 0) {
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: 'SET_LOCATION', latitude, longitude, radius },
              '*'
            );
          }, 100);
        }
      } else if (event.data.type === 'GEOCODE_SEARCH') {
        // Handle geocoding search request from iframe
        handleGeocodeSearch(event.data.query);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [latitude, longitude, radius, onLocationSelect]);

  useEffect(() => {
    if (mapReady && iframeRef.current && radius) {
      iframeRef.current.contentWindow?.postMessage({ type: 'UPDATE_RADIUS', radius }, '*');
    }
  }, [radius, mapReady]);

  if (!blobUrl) {
    return (
      <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#0B3060]" />
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      className="w-full h-[500px] border-0 rounded"
      title="Interactive Map"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

export function GeofenceSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState<GeofenceConfig>({
    center_latitude: 0,
    center_longitude: 0,
    radius_meters: 100,
    enabled: false,
    location_name: '',
  });

  const mapSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 [GeofenceSettings] Loading geofence configuration...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 🚀 STEP 1: Try cache first for instant load
      const cachedConfig = getCachedConfig();
      if (cachedConfig) {
        console.log('⚡ Cache hit! Showing cached data immediately');
        setConfig(cachedConfig);
        setIsLoading(false); // Show UI immediately
        
        // Background refresh if Supabase is configured
        if (isSupabaseConfigured) {
          console.log('🔄 Background: Checking for updates from database...');
          try {
            const response = await fetch(`${API_BASE_URL}/geofence`, {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            });

            const result = await response.json();

            if (result.success && result.data) {
              // Update cache and state if data changed
              const dataChanged = JSON.stringify(result.data) !== JSON.stringify(cachedConfig);
              if (dataChanged) {
                console.log('🔄 New data found! Updating...');
                setConfig(result.data);
                setCachedConfig(result.data);
                saveGeofenceToLocalStorage(result.data);
              } else {
                console.log('✅ Cache is up to date');
              }
            }
          } catch (error: any) {
            console.warn('⚠️ Background refresh failed (using cached data):', error.message);
          }
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return;
      }

      // 🔄 STEP 2: No cache - load from database or localStorage
      setIsLoading(true);
      
      // Try loading from database first if Supabase is configured
      if (isSupabaseConfigured) {
        try {
          console.log('📡 Attempting to load from database...');
          const response = await fetch(`${API_BASE_URL}/geofence`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });

          const result = await response.json();

          if (result.success && result.data) {
            console.log('✅ Loaded geofence config from database');
            console.log('   - Radius: ' + result.data.radius_meters + ' meters');
            console.log('   - Enabled: ' + result.data.enabled);
            setConfig(result.data);
            setCachedConfig(result.data); // Cache for next time
            saveGeofenceToLocalStorage(result.data);
            setIsLoading(false);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return;
          } else if (result.success && !result.data) {
            console.log('ℹ️ No geofence configuration found in database');
          }
        } catch (error: any) {
          console.warn('⚠️ Database load error (auto-recovering):', error.message);
          // Silently fall back to localStorage - no user notification needed
        }
      }

      // Fall back to localStorage
      console.log('📂 Loading from localStorage...');
      try {
        const localConfig = loadGeofenceFromLocalStorage();
        if (localConfig) {
          console.log('✅ Loaded geofence config from localStorage');
          console.log('   - Radius: ' + localConfig.radius_meters + ' meters');
          console.log('   - Enabled: ' + localConfig.enabled);
          setConfig(localConfig);
          setCachedConfig(localConfig); // Cache for next time
        } else {
          console.log('ℹ️ No geofence configuration in localStorage');
        }
      } catch (error: any) {
        console.error('❌ localStorage load error:', error.message);
        // Don't propagate this error
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setIsLoading(false);
    };

    loadConfig();
  }, []);

  // Get current location
  const handleGetCurrentLocation = async () => {
    try {
      setIsSaving(true);
      toast.info('📍 Getting your current location...');

      const location = await getCurrentLocation();
      
      setConfig({
        ...config,
        center_latitude: location.latitude,
        center_longitude: location.longitude,
      });

      toast.success(
        `✅ Location captured! Accuracy: ${location.accuracy ? Math.round(location.accuracy) + 'm' : 'N/A'}`
      );
    } catch (error: any) {
      console.error('❌ Error getting location:', error);
      toast.error(error.message || 'Failed to get location');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle map location selection
  const handleMapLocationSelect = (lat: number, lng: number) => {
    setConfig({
      ...config,
      center_latitude: lat,
      center_longitude: lng,
    });
    toast.success(`✅ Location selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  // Save geofence configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (config.enabled && (config.center_latitude === 0 || config.center_longitude === 0)) {
      toast.error('❌ Please set a valid center location');
      return;
    }

    if (config.radius_meters < 1) {
      toast.error('❌ Radius must be at least 1 meter');
      return;
    }

    try {
      setIsSaving(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💾 [GeofenceSettings] SAVING CONFIGURATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Configuration to Save:');
      console.log('   - Center Latitude: ' + config.center_latitude);
      console.log('   - Center Longitude: ' + config.center_longitude);
      console.log('   - Radius: ' + config.radius_meters + ' meters');
      console.log('   - Enabled: ' + config.enabled);
      console.log('   - Location Name: ' + config.location_name);

      let dbSaveSuccess = false;

      // Try to save to database via backend API
      if (isSupabaseConfigured && projectId && publicAnonKey) {
        console.log('📡 Saving to database via backend server...');
        
        const configData = {
          center_latitude: config.center_latitude,
          center_longitude: config.center_longitude,
          radius_meters: config.radius_meters,
          enabled: config.enabled,
          location_name: config.location_name || null,
        };

        const response = await fetch(`${API_BASE_URL}/geofence/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(configData),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log('✅✅✅ [SUCCESS] Geofence config saved to database!');
          console.log('✅ Database Record ID:', result.data.id);
          console.log('✅ Saved Latitude:', result.data.center_latitude);
          console.log('✅ Saved Longitude:', result.data.center_longitude);
          console.log('✅ Saved Radius:', result.data.radius_meters + ' meters');
          console.log('✅ Enabled Status:', result.data.enabled);
          dbSaveSuccess = true;
          
          // Update local config with database ID
          setConfig({ ...config, id: result.data.id });
          
          // Update cache with saved data
          setCachedConfig(result.data);
          
          // Also save to localStorage as backup
          saveGeofenceToLocalStorage(result.data);
          console.log('✅ Also saved to localStorage as backup');
        } else {
          console.error('❌❌❌ [FAILED] Database save error!');
          console.error('❌ Error Message:', result.error || result.message);
          
          // Check if it's a table missing error
          if (result.error && result.error.includes('relation "geofence_config" does not exist')) {
            toast.error(
              '❌ Database table missing! Please create the geofence_config table in Supabase. Check GEOFENCE_TABLE_SETUP.md for instructions.',
              { duration: 8000 }
            );
          } else {
            toast.error('❌ Database error: ' + (result.error || 'Unknown error'), { duration: 5000 });
          }
          
          // Save to localStorage as fallback
          saveGeofenceToLocalStorage(config);
          console.log('✅ Saved to localStorage as fallback');
        }
      } else {
        console.warn('⚠️ Supabase not configured. Saving to localStorage only.');
        saveGeofenceToLocalStorage(config);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (dbSaveSuccess) {
        toast.success('✅ Geofence settings saved to database successfully!', { duration: 4000 });
      } else if (isSupabaseConfigured) {
        toast.warning('⚠️ Saved locally only. Database save failed.');
      } else {
        toast.success('✅ Saved locally! (Database not configured)');
      }
      
    } catch (error: any) {
      console.error('❌❌❌ [CRITICAL ERROR] Exception during save:', error);
      console.error('❌ Error stack:', error.stack);
      
      // Save to localStorage as fallback
      saveGeofenceToLocalStorage(config);
      toast.error('❌ Error: ' + (error.message || 'Unknown error. Saved locally instead.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Test geofence configuration
  const handleTestGeofence = async () => {
    try {
      setIsSaving(true);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧪 [GeofenceSettings] TESTING GEOFENCE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (!config.enabled) {
        toast.info('ℹ️ Geofencing is currently disabled');
        console.log('ℹ️ Geofencing disabled - Test skipped');
        return;
      }
      
      if (config.center_latitude === 0 || config.center_longitude === 0) {
        toast.error('❌ Please set a center location first');
        return;
      }
      
      // Get current location
      const location = await getCurrentLocation();
      
      console.log('📍 Test Data:');
      console.log('   - Current Location: (' + location.latitude + ', ' + location.longitude + ')');
      console.log('   - Center Location: (' + config.center_latitude + ', ' + config.center_longitude + ')');
      console.log('   - Configured Radius: ' + config.radius_meters + ' meters');
      
      // Calculate distance
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        config.center_latitude,
        config.center_longitude
      );
      
      const isWithinRadius = distance <= config.radius_meters;
      
      console.log('📏 Test Result:');
      console.log('   - Calculated Distance: ' + Math.round(distance) + ' meters');
      console.log('   - Is Within Radius: ' + isWithinRadius);
      console.log('   - Decision: ' + (isWithinRadius ? '✅ WOULD BE ALLOWED' : '❌ WOULD BE BLOCKED'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (isWithinRadius) {
        toast.success(
          `✅ TEST PASSED: You are ${formatDistance(Math.round(distance))} from center. Time In/Out would be ALLOWED.`,
          { duration: 5000 }
        );
      } else {
        toast.error(
          `❌ TEST FAILED: You are ${formatDistance(Math.round(distance))} away. Must be within ${formatDistance(config.radius_meters)}. Time In/Out would be BLOCKED.`,
          { duration: 5000 }
        );
      }
      
    } catch (error: any) {
      console.error('❌ [GeofenceSettings] Test error:', error);
      toast.error('❌ Test failed: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading geofence settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Card */}
      <Card>
        <div className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-xl flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1F2937]">Geofence Settings</h1>
                <p className="text-[#6B7280] mt-1">Control where employees can clock in and out</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 ${
              config.enabled 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-600 animate-pulse' : 'bg-gray-400'}`} />
              {config.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Settings Card */}
      <Card>
        <div className="p-8">
          <form onSubmit={handleSaveConfig} className="space-y-8">
            {/* Section 1: Enable/Disable */}
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0B3060]" />
                Geofence Status
              </h2>
              
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1F2937] text-lg mb-1">
                      Location-Based Access Control
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      {config.enabled
                        ? '✅ Employees must be within the defined radius to clock in/out'
                        : '⚠️ Location restrictions are disabled - employees can clock in from anywhere'}
                    </p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer ml-6">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-16 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-8 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-green-600 shadow-inner"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 2: Location Name */}
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-[#0B3060]" />
                Location Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                    Location Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.location_name}
                    onChange={(e) => setConfig({ ...config, location_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent transition-all"
                    placeholder="e.g., Main Office, HQ Building, Manila Branch"
                  />
                  <p className="text-xs text-[#6B7280] mt-2">
                    💡 Give this location a memorable name for easy identification
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Map & Coordinates */}
            <div ref={mapSectionRef}>
              <h2 className="text-xl font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-[#0B3060]" />
                Set Center Location
              </h2>

              {/* Interactive Map */}
              <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg mb-6">
                <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-5 h-5" />
                    <span className="font-semibold">Interactive Map</span>
                  </div>
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full">Click to select location</span>
                </div>
                
                <InteractiveMapPicker
                  latitude={config.center_latitude}
                  longitude={config.center_longitude}
                  radius={config.radius_meters}
                  enabled={config.enabled}
                  onLocationSelect={handleMapLocationSelect}
                />
                
                <div className="bg-gray-50 px-5 py-3 border-t-2 border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    Red marker = center location
                  </p>
                  <p className="text-xs text-gray-600 flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    Green circle = allowed radius
                  </p>
                </div>
              </div>

              {/* Manual Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={config.center_latitude}
                    onChange={(e) =>
                      setConfig({ ...config, center_latitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent font-mono text-sm"
                    placeholder="14.599512"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={config.center_longitude}
                    onChange={(e) =>
                      setConfig({ ...config, center_longitude: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent font-mono text-sm"
                    placeholder="120.984222"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Radius Slider */}
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#0B3060]" />
                Allowed Radius
              </h2>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-lg font-semibold text-purple-900">
                    Radius Distance
                  </label>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDistance(config.radius_meters)}
                  </div>
                </div>
                
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={config.radius_meters}
                  onChange={(e) =>
                    setConfig({ ...config, radius_meters: parseInt(e.target.value) })
                  }
                  className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  style={{
                    background: `linear-gradient(to right, #9333ea 0%, #9333ea ${(config.radius_meters / 5000) * 100}%, #e9d5ff ${(config.radius_meters / 5000) * 100}%, #e9d5ff 100%)`
                  }}
                />
                
                <div className="flex justify-between text-xs text-purple-700 mt-2 font-medium">
                  <span>50m (Strict)</span>
                  <span>2.5km (Moderate)</span>
                  <span>5km (Flexible)</span>
                </div>
                
                <p className="text-sm text-purple-800 mt-4 bg-white/50 p-3 rounded-lg">
                  💡 <strong>Tip:</strong> Employees must be within this distance from the center location to clock in/out
                </p>
              </div>
            </div>

            {/* Configuration Preview */}
            {config.center_latitude !== 0 && config.center_longitude !== 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
                <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2 text-lg">
                  <Check className="w-5 h-5" />
                  Configuration Summary
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/60 rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Status</p>
                    <p className="font-bold text-lg">
                      {config.enabled ? '🟢 Active & Enforced' : '🔴 Disabled'}
                    </p>
                  </div>
                  {config.location_name && (
                    <div className="bg-white/60 rounded-lg p-4">
                      <p className="text-gray-600 mb-1">Location</p>
                      <p className="font-bold text-lg">{config.location_name}</p>
                    </div>
                  )}
                  <div className="bg-white/60 rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Center Coordinates</p>
                    <p className="font-mono text-sm font-bold">
                      {config.center_latitude.toFixed(6)}, {config.center_longitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-4">
                    <p className="text-gray-600 mb-1">Allowed Radius</p>
                    <p className="font-bold text-lg text-purple-600">{formatDistance(config.radius_meters)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl text-lg"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Save Geofence Settings
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleTestGeofence}
                disabled={isSaving || !config.enabled || config.center_latitude === 0}
                className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Test Location
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}