import React, { useCallback, useRef } from 'react';
import { GoogleMap, LoadScript } from '@react-google-maps/api';

const center = {
  lat: 12.9716,
  lng: 77.5946,
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const EmergencyRouteMap = () => {
  const mapRef = useRef(null);

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;

    const directionsService = new window.google.maps.DirectionsService();
    const directionsRenderer = new window.google.maps.DirectionsRenderer();

    directionsRenderer.setMap(map);

    directionsService.route(
      {
        origin: { lat: 12.9716, lng: 77.5946 },
        destination: { lat: 12.9352, lng: 77.6140 },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed due to ' + status);
        }
      }
    );
  }, []);

  if (!googleMapsApiKey) {
    return (
      <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
        Configure VITE_GOOGLE_MAPS_API_KEY in vvce/.env.local to display the map.
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={googleMapsApiKey}>
      <GoogleMap
        mapContainerStyle={{ height: '400px', width: '100%' }}
        center={center}
        zoom={13}
        onLoad={handleMapLoad}
      >
        {/* other children like markers or overlays */}
      </GoogleMap>
    </LoadScript>
  );
};

export default EmergencyRouteMap;
