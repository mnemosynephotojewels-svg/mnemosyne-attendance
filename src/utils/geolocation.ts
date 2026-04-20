/**
 * Geolocation Utilities for Mnemosyne QR Attendance System
 * Handles location tracking and radius-based access control
 */

export interface GeofenceConfig {
  id?: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  enabled: boolean;
  location_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationStatus {
  isWithinRadius: boolean;
  distance: number; // Distance in meters
  hasPermission: boolean;
  error?: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get current user location using Geolocation API
 */
export async function getCurrentLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Check if current location is within the allowed radius
 */
export async function checkLocationAccess(
  geofence: GeofenceConfig
): Promise<LocationStatus> {
  try {
    // If geofencing is disabled, allow access
    if (!geofence.enabled) {
      console.log('✅ [Geolocation] Geofencing disabled - Access granted');
      return {
        isWithinRadius: true,
        distance: 0,
        hasPermission: true,
      };
    }

    console.log('📍 [Geolocation] Getting current location...');
    // Get current location
    const currentLocation = await getCurrentLocation();
    console.log('✅ [Geolocation] Current location obtained:', currentLocation);

    // Calculate distance from center
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      geofence.center_latitude,
      geofence.center_longitude
    );

    console.log('📏 [Geolocation] Distance Calculation:');
    console.log('   User Location: (' + currentLocation.latitude + ', ' + currentLocation.longitude + ')');
    console.log('   Center Location: (' + geofence.center_latitude + ', ' + geofence.center_longitude + ')');
    console.log('   Calculated Distance: ' + Math.round(distance) + ' meters');
    console.log('   Allowed Radius: ' + geofence.radius_meters + ' meters');

    // Check if within radius
    const isWithinRadius = distance <= geofence.radius_meters;
    
    console.log('🎯 [Geolocation] Radius Check: ' + Math.round(distance) + 'm <= ' + geofence.radius_meters + 'm ? ' + isWithinRadius);

    return {
      isWithinRadius,
      distance: Math.round(distance),
      hasPermission: true,
    };
  } catch (error: any) {
    console.error('❌ [Geolocation] Error:', error.message);
    return {
      isWithinRadius: false,
      distance: 0,
      hasPermission: false,
      error: error.message,
    };
  }
}

/**
 * Request location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    await getCurrentLocation();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Get location status icon and color
 */
export function getLocationStatusDisplay(status: LocationStatus): {
  icon: string;
  color: string;
  text: string;
} {
  if (!status.hasPermission) {
    return {
      icon: '🚫',
      color: 'text-red-600',
      text: 'Location Permission Required',
    };
  }

  if (status.isWithinRadius) {
    return {
      icon: '✅',
      color: 'text-green-600',
      text: 'Within Allowed Area',
    };
  }

  return {
    icon: '⚠️',
    color: 'text-red-600',
    text: 'Outside Allowed Area',
  };
}

/**
 * Save geofence configuration to localStorage (backup)
 */
export function saveGeofenceToLocalStorage(config: GeofenceConfig): void {
  localStorage.setItem('mnemosyne_geofence_config', JSON.stringify(config));
}

/**
 * Load geofence configuration from localStorage
 */
export function loadGeofenceFromLocalStorage(): GeofenceConfig | null {
  const stored = localStorage.getItem('mnemosyne_geofence_config');
  if (stored) {
    try {
      console.log('🔍 [Geolocation] Raw stored config:', stored.substring(0, 100));
      const parsed = JSON.parse(stored);
      console.log('✅ [Geolocation] Successfully parsed config from localStorage');
      return parsed;
    } catch (error: any) {
      console.warn('⚠️ [Geolocation] Corrupted geofence config detected, auto-cleaning...');
      console.warn('   Error:', error.message);
      
      // Clear corrupted data silently
      localStorage.removeItem('mnemosyne_geofence_config');
      
      return null;
    }
  }
  return null;
}

/**
 * Watch location continuously
 */
export function watchLocation(
  callback: (location: LocationCoordinates) => void,
  errorCallback?: (error: string) => void
): number {
  if (!navigator.geolocation) {
    errorCallback?.('Geolocation not supported');
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      errorCallback?.(error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );
}

/**
 * Stop watching location
 */
export function stopWatchingLocation(watchId: number): void {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}