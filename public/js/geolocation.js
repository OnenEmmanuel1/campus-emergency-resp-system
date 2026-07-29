/**
 * CampusAlert - Geolocation Capture Helper
 * Uses browser-native Geolocation API (client-side, no external hardware dependencies)
 */

const CAMPUS_DEFAULT_LAT = 40.712776; // Default Campus Center Latitude
const CAMPUS_DEFAULT_LNG = -74.005974; // Default Campus Center Longitude

/**
 * Retrieves the current browser coordinates.
 * Falls back to default campus coordinates if denied or unavailable.
 * @returns {Promise<{latitude: number, longitude: number, isFallback: boolean}>}
 */
function getCampusGeolocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser. Using campus defaults.');
      return resolve({
        latitude: CAMPUS_DEFAULT_LAT,
        longitude: CAMPUS_DEFAULT_LNG,
        isFallback: true,
        error: 'Unsupported'
      });
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isFallback: false
        });
      },
      (error) => {
        let errorMsg = 'Unknown error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permission denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Position unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Location request timed out.';
            break;
        }
        console.warn(`Geolocation error: ${errorMsg}. Falling back to default campus center coordinates.`);
        resolve({
          latitude: CAMPUS_DEFAULT_LAT,
          longitude: CAMPUS_DEFAULT_LNG,
          isFallback: true,
          error: errorMsg
        });
      },
      options
    );
  });
}
