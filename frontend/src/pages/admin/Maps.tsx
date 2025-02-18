import React, { useState, useEffect, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon,
  useMap,
  useMapEvents  // Add this import
} from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import '../../styles/AdminMap.css';
import { useNavigate } from 'react-router-dom';

// Add this constant for directions URL
const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/?api=1";

// Import marker icons directly
import markerIcon2x from '../../img/Emil.jpg';
import markerIcon from '../../img/hya.jpg';
import markerShadow from '../../img/jason.jpg';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

// Create a default marker icon
const defaultIcon = new Icon({
  iconUrl: '../../img/Emil.jpg',
  iconRetinaUrl: '../../img/hya.jpg',
  shadowUrl: '../../img/jason.jpg',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const KKMK_OFFICE_COORDINATES: [number, number] = [14.717955, 121.107932];

interface LocationMarker {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: 'church' | 'event' | 'scholar' | 'office';  // Add 'office' type
  details: any;  // Store any additional type-specific data
  intensity?: number;  // Add this for heatmap
}

// Update the interface for events with coordinates
interface DBEvent {
  id: number;
  title: string;
  date: string;
  description: string;
  location: string;
  latitude: string;  // Changed to string since it comes from API
  longitude: string; // Changed to string since it comes from API
  status: 'OPEN' | 'CLOSED';
  image?: string;
}

interface Church {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
}

interface Event {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  date: string;
  description: string;
}

interface Scholar {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  profile_photo?: string;
}

// Add this new component before AdminMap
const PersistentPopup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const map = useMapEvents({
    popupclose: (e) => {
      e.popup.openOn(map);
    }
  });
  return null;
};

enum MapType {
  STANDARD = 'standard',
  HEATMAP = 'heatmap'
}

enum LocationType {
  ALL = 'all',
  EVENTS = 'events',
  CHURCHES = 'churches',
  SCHOLARS = 'scholars',
  OFFICE = 'office'  // Add this line
}

// Define the polygon coordinates outside components
const PAYATAS_POLYGON: [number, number][] = [
  [14.7297784, 121.1183808],
  [14.7284917, 121.1174367],
  // ... (keep all the other coordinates)
  [14.7297784, 121.1183808]
];

// Add this new component for the heatmap
const HeatmapLayer: React.FC<{ points: any[], polygon: [number, number][] }> = ({ points, polygon }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    try {
      // Remove existing heat layer if it exists
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }

      // Create bounds from first and last points of polygon
      const southWest = L.latLng(
        Math.min(...polygon.map(p => p[0])),
        Math.min(...polygon.map(p => p[1]))
      );
      const northEast = L.latLng(
        Math.max(...polygon.map(p => p[0])),
        Math.max(...polygon.map(p => p[1]))
      );
      const bounds = L.latLngBounds(southWest, northEast);

      // Filter points to only include those within bounds
      const filteredPoints = points.filter(p => {
        const latLng = L.latLng(p.lat, p.lng);
        return bounds.contains(latLng);
      });

      // Create new heat layer
      const heatLayer = (L as any).heatLayer(
        filteredPoints.map(p => [p.lat, p.lng, p.intensity || 0.5]),
        {
          radius: 15,
          blur: 10,
          maxZoom: 18,
          max: 1.0,
          minOpacity: 0.6,
          gradient: {
            0.2: 'blue',
            0.4: 'cyan',
            0.6: 'lime',
            0.8: 'yellow',
            1.0: 'red'
          }
        }
      );

      heatLayer.addTo(map);
      heatLayerRef.current = heatLayer;

      // Set map view to bounds
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16
      });

      // Set map restrictions
      map.setMinZoom(15);
      map.setMaxZoom(18);
      
      // Create padded bounds for map restrictions
      const paddedBounds = bounds.pad(0.05);
      map.setMaxBounds(paddedBounds);

    } catch (error) {
      console.error('Error setting up heatmap:', error);
    }

    return () => {
      if (heatLayerRef.current && map) {
        try {
          map.removeLayer(heatLayerRef.current);
          heatLayerRef.current = null;
        } catch (error) {
          console.error('Error cleaning up heatmap:', error);
        }
      }
    };
  }, [map, points, polygon]);

  return null;
};

// Add Payatas coordinates constant at the top level
const PAYATAS_COORDINATES: [number, number] = [14.7164, 121.1194];

// Add this new component for map reset
const MapReset: React.FC<{ mapType: MapType }> = ({ mapType }) => {
  const map = useMap();
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (mapType === MapType.HEATMAP) {
      // Heatmap view settings
      const bounds = L.latLngBounds(PAYATAS_POLYGON);
      map.setView(PAYATAS_COORDINATES, 16);
      map.fitBounds(bounds);
      map.setMinZoom(15);
      map.setMaxZoom(18);
      map.setMaxBounds(bounds.pad(0.05));
    } else {
      // Standard view settings - remove all restrictions
      map.setMinZoom(1);
      map.setMaxZoom(18);
      map.setMaxBounds(undefined);
      // Don't auto-zoom, let user control the view
      map.options.minZoom = undefined;
      map.options.maxZoom = undefined;
      map.options.maxBounds = undefined;
    }
  }, [map, mapType]);

  return null;
};

interface Distribution {
  id: number;
  itemName: string;
  quantity: number;
  category: string;
  distributedAt: string;
}

const officeIcon = new Icon({
  iconUrl: '/images/kkmk-logo.png', // Make sure to add this image to your public folder
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
  className: 'office-marker'
});

// First, create a constant for the office marker outside the component:
const OFFICE_MARKER: LocationMarker = {
  id: -1,
  lat: KKMK_OFFICE_COORDINATES[0],
  lng: KKMK_OFFICE_COORDINATES[1],
  name: 'KapatidKita MahalKita Main Office',
  type: 'office',
  details: {
    address: 'Payatas, Quezon City',
    description: 'KKMK Main Office Location'
  }
};

const AdminMap: React.FC = () => {
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<LocationMarker[]>([OFFICE_MARKER]);
  const [loading, setLoading] = useState(true);
  const [activeMarkers, setActiveMarkers] = useState<number>(0);
  const [dbEvents, setDbEvents] = useState<DBEvent[]>([]);
  const [heatmapData, setHeatmapData] = useState<Array<{lat: number; lng: number; intensity: number}>>([]);
  const [mapType, setMapType] = useState<MapType>(MapType.STANDARD);
  const [locationType, setLocationType] = useState<LocationType>(LocationType.ALL);
  const [scholars, setScholars] = useState<Scholar[]>([]);
  const [verifiedScholars, setVerifiedScholars] = useState<Scholar[]>([]);
  const [scholarDistributions, setScholarDistributions] = useState<{[key: number]: Distribution[]}>({});

  // Add Payatas, Quezon City coordinates
  const PAYATAS_COORDINATES: [number, number] = [14.7164, 121.1194];
  const DEFAULT_ZOOM = 14; // Closer zoom level for better area visibility

  // Swap longitude and latitude in the coordinates array
  const PAYATAS_POLYGON: [number, number][] = [
    [14.7297784, 121.1183808],
    [14.7284917, 121.1174367],
    [14.7276201, 121.1167929],
    [14.7269975, 121.1153767],
    [14.726541, 121.1143897],
    [14.7258354, 121.1134455],
    [14.7238016, 121.1128876],
    [14.7225979, 121.1130164],
    [14.7218923, 121.1128447],
    [14.7213942, 121.1117718],
    [14.7213527, 121.1105702],
    [14.7220583, 121.1085103],
    [14.7223488, 121.1069653],
    [14.7230545, 121.1058495],
    [14.7231375, 121.1052487],
    [14.7226809, 121.1036179],
    [14.7220583, 121.1032746],
    [14.7209791, 121.101558],
    [14.720232, 121.1005709],
    [14.7186547, 121.1005709],
    [14.717119, 121.100528],
    [14.7164134, 121.099541],
    [14.7149606, 121.0977385],
    [14.7147115, 121.0966656],
    [14.7143795, 121.0956357],
    [14.7137154, 121.0949061],
    [14.7140889, 121.0932324],
    [14.7141304, 121.0919879],
    [14.7141304, 121.0905287],
    [14.7135078, 121.0899708],
    [14.7127192, 121.0901854],
    [14.7120135, 121.0900567],
    [14.7114739, 121.0884688],
    [14.7091909, 121.0854647],
    [14.7048325, 121.0889409],
    [14.7032966, 121.0891554],
    [14.7029645, 121.0900567],
    [14.70284, 121.0924599],
    [14.7027985, 121.0937045],
    [14.702757, 121.0955498],
    [14.703006, 121.0976956],
    [14.7027985, 121.0998843],
    [14.7023003, 121.1022017],
    [14.7020513, 121.1036608],
    [14.7022173, 121.1050341],
    [14.7027985, 121.1059353],
    [14.7040853, 121.1068366],
    [14.704957, 121.1078665],
    [14.7056626, 121.1092827],
    [14.7052475, 121.1108706],
    [14.7051645, 121.1125872],
    [14.705206, 121.1131451],
    [14.7067419, 121.1139176],
    [14.7087343, 121.1146901],
    [14.7133003, 121.1162779],
    [14.7179491, 121.1194537],
    [14.7189038, 121.1200116],
    [14.7247147, 121.1214278],
    [14.7253788, 121.1215136],
    [14.7258354, 121.1212561],
    [14.7264579, 121.1215136],
    [14.7297784, 121.1183808]
  ];

  // Add church coordinates
  const CHURCH_LOCATION: [number, number] = [14.715425, 121.104446]; // Ascension of Our Lord Parish coordinates

  // Create custom church icon
  const churchIcon = new Icon({
    iconUrl: '/images/jason.jpg', // Add a church icon image to your public folder
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Add new scholar icon
  const scholarIcon = new Icon({
    iconUrl: '/images/default-avatar.jpg',
    iconSize: [35, 35],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
    className: 'scholar-marker'
  });

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const [churchesRes, eventsRes] = await Promise.all([
          fetch('http://localhost:5175/api/churches'),
          fetch('http://localhost:5175/api/events/locations')
        ]);

        const churches = await churchesRes.json();
        const events = await eventsRes.json();

        // Filter out events that don't have coordinates
        const validEvents = events.filter((e: any) => e.lat && e.lng);

        const allMarkers: LocationMarker[] = [
          OFFICE_MARKER,
          ...churches.map((c: any) => ({
            id: c.id,
            lat: c.lat,
            lng: c.lng,
            name: c.name,
            type: 'church' as const,
            details: c
          })),
          ...validEvents.map((e: any) => ({
            id: e.id,
            lat: e.lat,
            lng: e.lng,
            name: e.name || e.title,
            type: 'event' as const,
            details: e
          }))
        ];

        setMarkers(allMarkers);
        setActiveMarkers(allMarkers.length); // Update active markers count
        setLoading(false);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Add scholar fetching effect
  useEffect(() => {
    const fetchScholars = async () => {
      try {
        const response = await axios.get('http://localhost:5175/api/scholars');
        const scholarsWithLocation = response.data.filter(
          (scholar: Scholar) => scholar.latitude && scholar.longitude
        );

        const scholarMarkers = scholarsWithLocation.map((scholar: Scholar) => ({
          id: scholar.id,
          lat: scholar.latitude,
          lng: scholar.longitude,
          name: scholar.name,
          type: 'scholar' as const,
          details: scholar
        }));

        setMarkers(prevMarkers => {
          // Keep office marker and other non-scholar markers
          const nonScholarMarkers = prevMarkers.filter(m => m.type === 'office' || m.type === 'event');
          return [...nonScholarMarkers, ...scholarMarkers];
        });

        setScholars(scholarsWithLocation);
      } catch (error) {
        console.error('Error fetching scholars:', error);
      }
    };

    fetchScholars();
  }, []);

  // Update the fetchEvents effect
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get('http://localhost:5175/api/events');
        
        const eventsWithCoordinates = response.data.filter((event: DBEvent) => {
          // Filter out events that don't have coordinates or are past due
          const eventDate = new Date(event.date);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Reset time part to compare dates only
          
          return event.latitude !== null && 
                 event.longitude !== null && 
                 event.status === 'OPEN' &&
                 eventDate >= now;
        });

        const eventMarkers = eventsWithCoordinates.map((event: DBEvent) => {
          // Debug log
          console.log('Processing event:', {
            id: event.id,
            title: event.title,
            rawImage: event.image,
            rawResponse: event
          });

          // Construct image URL with fallback
          const imageUrl = event.image
            ? `http://localhost:5175${event.image}`
            : '/images/default-event.jpg';

          return {
            id: event.id,
            lat: parseFloat(event.latitude),
            lng: parseFloat(event.longitude),
            name: event.title,
            type: 'event' as const,
            details: {
              ...event,
              date: new Date(event.date).toLocaleDateString(),
              address: event.location,
              image: imageUrl,
              rawImagePath: event.image // Store original path for debugging
            }
          };
        });

        console.log('Created event markers:', eventMarkers);
        
        setMarkers(prevMarkers => {
          // Keep office marker and non-event markers
          const nonEventMarkers = prevMarkers.filter(m => m.type === 'office' || m.type === 'scholar');
          return [...nonEventMarkers, ...eventMarkers];
        });

        setDbEvents(response.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (mapType === MapType.HEATMAP) {
      // Convert markers to heatmap data
      const heatData = markers.map(marker => ({
        lat: marker.lat,
        lng: marker.lng,
        intensity: marker.type === 'church' ? 1.0 : 0.5
      }));
      setHeatmapData(heatData);
    }
  }, [markers, mapType]);

  useEffect(() => {
    const filteredMarkers = markers.filter(marker => {
      if (locationType === LocationType.ALL) return true;
      if (locationType === LocationType.CHURCHES) return marker.type === 'church';
      if (locationType === LocationType.EVENTS) return marker.type === 'event';
      if (locationType === LocationType.SCHOLARS) return marker.type === 'scholar';
      if (locationType === LocationType.OFFICE) return marker.type === 'office';
      return false;
    });
    setActiveMarkers(filteredMarkers.length);
  }, [markers, locationType]);

  // Add this effect to fetch verified scholar locations
  useEffect(() => {
    const fetchVerifiedScholars = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5175/api/scholars/verified-locations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Received scholar data:', response.data); // Debug log

        const scholarMarkers = response.data.map((scholar: any) => ({
          id: scholar.id,
          lat: parseFloat(scholar.latitude),
          lng: parseFloat(scholar.longitude),
          name: scholar.name,
          type: 'scholar' as const,
          details: {
            ...scholar,
            // Use the profile_photo directly as it's already properly formatted
            profile_photo: scholar.profile_photo || '/images/default-avatar.jpg'
          }
        }));

        console.log('Created scholar markers:', scholarMarkers); // Debug log

        setMarkers(prev => {
          const nonScholarMarkers = prev.filter(m => m.type === 'office' || m.type === 'event');
          return [...nonScholarMarkers, ...scholarMarkers];
        });
        setVerifiedScholars(response.data);
      } catch (error) {
        console.error('Error fetching verified scholars:', error);
      }
    };

    if (locationType === LocationType.SCHOLARS || locationType === LocationType.ALL) {
      fetchVerifiedScholars();
    }
  }, [locationType]);

  // Add new effect to fetch scholar distributions
  useEffect(() => {
    const fetchScholarDistributions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'http://localhost:5175/api/inventory/distributions-with-location',
          { headers: { Authorization: `Bearer ${token}` }}
        );

        // Group distributions by scholar ID
        const distributionsByScholar = response.data.reduce((acc: {[key: number]: Distribution[]}, curr: any) => {
          if (curr.recipientId) {
            if (!acc[curr.recipientId]) {
              acc[curr.recipientId] = [];
            }
            acc[curr.recipientId].push({
              id: curr.id,
              itemName: curr.itemName,
              quantity: curr.quantity,
              category: curr.category,
              distributedAt: curr.distributedAt
            });
          }
          return acc;
        }, {});

        setScholarDistributions(distributionsByScholar);
      } catch (error) {
        console.error('Error fetching scholar distributions:', error);
      }
    };

    if (locationType === LocationType.SCHOLARS || locationType === LocationType.ALL) {
      fetchScholarDistributions();
    }
  }, [locationType]);

  // Add this new effect to handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    if (filter === 'scholars') {
      setLocationType(LocationType.SCHOLARS);
    }
  }, []);

  const formatAmount = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStandardMap = () => (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Polygon
        positions={PAYATAS_POLYGON}
        pathOptions={{
          color: '#FF0000',
          fillColor: '#2c5282',
          fillOpacity: 0.1,
          weight: 2
        }}
      />
    </>
  );

  const renderHeatmap = () => (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Polygon
        positions={PAYATAS_POLYGON}
        pathOptions={{
          color: '#FF0000',
          fillColor: 'transparent',
          weight: 2
        }}
      />
      <HeatmapLayer 
        points={markers.map(marker => ({
          lat: marker.lat,
          lng: marker.lng,
          // Use a default intensity based on marker type
          intensity: marker.type === 'church' ? 1.0 : 0.5
        }))}
        polygon={PAYATAS_POLYGON}
      />
    </>
  );

  // Update the renderMapContent function
  const renderScholarPopup = (marker: LocationMarker) => {
    const scholarDist = scholarDistributions[marker.id] || [];
    const recentDistributions = scholarDist
      .sort((a, b) => new Date(b.distributedAt).getTime() - new Date(a.distributedAt).getTime())
      .slice(0, 3); // Show only last 3 distributions

    // Improved profile photo handling
    let profilePhotoUrl = '/images/default-avatar.jpg';
    const photo = marker.details.profile_photo;

    if (photo) {
      if (photo.startsWith('data:image')) {
        profilePhotoUrl = photo; // Use base64 data directly
      } else if (photo.startsWith('http')) {
        profilePhotoUrl = photo; // Use full URL
      } else if (photo.startsWith('/uploads/')) {
        profilePhotoUrl = `http://localhost:5175${photo}`; // Add server URL to path
      }
    }

    console.log('Using profile photo:', {
      original: marker.details.profile_photo,
      processed: profilePhotoUrl
    });

    // Add function to handle directions
    const handleGetDirections = () => {
      const origin = `${KKMK_OFFICE_COORDINATES[0]},${KKMK_OFFICE_COORDINATES[1]}`;
      const destination = `${marker.lat},${marker.lng}`;
      const url = `${GOOGLE_MAPS_DIRECTIONS_URL}&origin=${origin}&destination=${destination}`;
      window.open(url, '_blank');
    };

    return (
      <div className="scholar-popup-content">
        <div className="profile-section">
          <div className="scholar-image">
            <img
              src={profilePhotoUrl}
              alt={marker.name}
              onError={(e) => {
                console.error('Failed to load image:', profilePhotoUrl);
                const target = e.target as HTMLImageElement;
                target.src = '/images/default-avatar.jpg';
                target.onerror = null;
              }}
            />
          </div>
          <div className="scholar-info">
            <h3>{marker.name}</h3>
            <p className="address">
              <strong>Address:</strong><br />
              {marker.details.address || 'No address specified'}
            </p>
          </div>
        </div>

        {recentDistributions.length > 0 && (
          <div className="recent-distributions">
            <h4>Recent Distributions</h4>
            {recentDistributions.map((dist, index) => (
              <div key={dist.id} className="distribution-item">
                <div className="distribution-header">
                  <span className="category-tag">{dist.category}</span>
                  <span className="date">{new Date(dist.distributedAt).toLocaleDateString()}</span>
                </div>
                <p className="item-details">
                  {dist.quantity}x {dist.itemName}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="popup-buttons">
          <button 
            className="view-details-btn"
            onClick={() => navigate(`/admin/scholars/${marker.id}`)}
          >
            View Scholar Profile
          </button>
          <button 
            className="directions-btn"
            onClick={handleGetDirections}
          >
            Get Directions
          </button>
        </div>
      </div>
    );
  };

  const renderMapContent = () => {
    const visibleMarkers = markers.filter(marker => {
      if (locationType === LocationType.ALL) return true;
      if (locationType === LocationType.CHURCHES) return marker.type === 'church';
      if (locationType === LocationType.EVENTS) return marker.type === 'event';
      if (locationType === LocationType.SCHOLARS) return marker.type === 'scholar';
      if (locationType === LocationType.OFFICE) return marker.type === 'office';
      return false;
    });

    return visibleMarkers.map(marker => {
      const lat = Number(marker.lat);
      const lng = Number(marker.lng);

      if (isNaN(lat) || isNaN(lng)) {
        console.warn('Invalid coordinates for marker:', marker);
        return null;
      }

      // Create custom icon for events using their image
      const getCustomIcon = () => {
        if (marker.type === 'office') {
          return officeIcon;
        }
        if (marker.type === 'event') {
          const imageUrl = marker.details.image;
          console.log('Using image URL for marker:', imageUrl);
          
          return new Icon({
            iconUrl: imageUrl,
            iconSize: [45, 45],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22],
            className: 'custom-event-marker',
            tooltipAnchor: [16, -28]
          });
        }
        
        if (marker.type === 'scholar') {
          // Create custom scholar icon using their profile photo
          let iconUrl = '/images/default-avatar.jpg';
          const photo = marker.details.profile_photo;

          if (photo) {
            if (photo.startsWith('data:image')) {
              iconUrl = photo;
            } else if (photo.startsWith('http')) {
              iconUrl = photo;
            } else if (photo.startsWith('/uploads/')) {
              iconUrl = `http://localhost:5175${photo}`;
            }
          }

          return new Icon({
            iconUrl: iconUrl,
            iconSize: [35, 35],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17],
            className: 'scholar-marker',
          });
        }
        
        return marker.type === 'church' ? churchIcon : defaultIcon;
      };

      return (
        <Marker
          key={`${marker.type}-${marker.id}`}
          position={[lat, lng]}
          icon={getCustomIcon()}
        >
          <Popup
            // Add these popup options for scholar type
            {...(marker.type === 'scholar' ? {
              minWidth: 280,
              maxWidth: 280,
              className: 'scholar-popup-wrapper',
              closeButton: true,
            } : {
              className: ''
            })}
          >
            <div className={`marker-popup ${marker.type} ${marker.type === 'scholar' ? 'scholar-popup' : ''}`}>
              {marker.type === 'scholar' ? (
                renderScholarPopup(marker)
              ) : (
                // ... existing popup content for other types ...
                <>
                  {marker.type === 'event' && (
                    <div className="marker-image-container">
                      <img
                        src={marker.details.image}
                        alt={marker.name}
                        className="marker-event-image"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/default-event.jpg';
                          console.error('Failed to load image:', marker.details.image);
                        }}
                      />
                    </div>
                  )}
                  <h3>{marker.name}</h3>
                  {marker.type === 'event' && (
                    <>
                      <p><strong>Date:</strong> {marker.details.date}</p>
                      <p><strong>Location:</strong> {marker.details.address}</p>
                      <p><strong>Description:</strong> {marker.details.description}</p>
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewEventDetails(marker.details)}
                      >
                        Edit Event Details
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </Popup>
        </Marker>
      );
    }).filter(Boolean); // Remove null values
  };

  // Update the MapContainer settings
  const mapSettings = {
    center: PAYATAS_COORDINATES,
    zoom: mapType === MapType.HEATMAP ? 16 : 14,
    className: "admin-map",
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true
  };

  // Update the handleViewEventDetails function
  const handleViewEventDetails = (eventDetails: any) => {
    try {
      // Store the full event details in localStorage
      localStorage.setItem('eventToEdit', JSON.stringify({
        id: eventDetails.id,
        title: eventDetails.title || eventDetails.name,
        date: eventDetails.date,
        location: eventDetails.address || eventDetails.location,
        description: eventDetails.description,
        status: eventDetails.status || 'OPEN',
        latitude: eventDetails.lat || eventDetails.latitude,
        longitude: eventDetails.lng || eventDetails.longitude
      }));

      // Navigate to the admin events page instead of the regular events page
      navigate('/Event');
    } catch (error) {
      console.error('Error navigating to event:', error);
    }
  };

  return (
    <div className="admin-map-container">
      <div className="map-header">
        <h1 className='location-h1'>Location Map Overview</h1>
        <div className="map-type-selector">
          <button 
            className={`map-type-btn ${mapType === MapType.STANDARD ? 'active' : ''}`}
            onClick={() => setMapType(MapType.STANDARD)}
          >
            Standard Map
          </button>
          <button 
            className={`map-type-btn ${mapType === MapType.HEATMAP ? 'active' : ''}`}
            onClick={() => setMapType(MapType.HEATMAP)}
          >
            Heatmap View
          </button>
        </div>
      <div className="map-filters">
          <select 
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
            className="location-filter"
          >
            <option value={LocationType.ALL}>All Locations</option>
            <option value={LocationType.EVENTS}>Events</option>
            <option value={LocationType.SCHOLARS}>Scholars</option>
            <option value={LocationType.OFFICE}>Main Office</option>
          </select>
        </div>
      </div>

      <div className="map-stats">
        <div className="stat-card">
          <h3>Active Locations</h3>
          <p>{activeMarkers}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading map data...</div>
      ) : (
        <MapContainer {...mapSettings} key={`map-${mapType}`}>
          <MapReset mapType={mapType} />
          {mapType === MapType.STANDARD && renderStandardMap()}
          {mapType === MapType.HEATMAP && renderHeatmap()}
          {renderMapContent()}
        </MapContainer>
      )}
    </div>
  );
};

export default AdminMap;
