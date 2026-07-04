import React, { useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import './CreateSchool.css';

interface CreateSchoolProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateSchool: React.FC<CreateSchoolProps> = ({ isOpen, onClose }) => {
  const defaultLocation = { lat: 28.6139, lng: 77.2090 };
  const mapTilerKey = 'm00gCZTujgRHYomLPr66';
  const tileSize = 256;
  const [formData, setFormData] = useState({
    schoolName: '',
    street: '',
    city: '',
    pinCode: '',
    country: '',
    state: '',
    landmark: '',
    latitude: defaultLocation.lat.toFixed(6),
    longitude: defaultLocation.lng.toFixed(6),
    phone: '',
    email: '',
  });
  const [mapCenter, setMapCenter] = useState(defaultLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Default location selected. Click map or use current location.');
  const [mapZoom, setMapZoom] = useState(17);

  const fullAddress = useMemo(() => {
    return [
      formData.street,
      formData.landmark,
      formData.city,
      formData.state,
      formData.pinCode,
      formData.country,
    ].filter(Boolean).join(', ');
  }, [formData]);

  const lngToTileX = (lng: number, zoom: number) => {
    return ((lng + 180) / 360) * Math.pow(2, zoom);
  };

  const latToTileY = (lat: number, zoom: number) => {
    const latRad = (lat * Math.PI) / 180;
    return (
      ((1 -
        Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
        2) *
      Math.pow(2, zoom)
    );
  };

  const tileXToLng = (x: number, zoom: number) => {
    return (x / Math.pow(2, zoom)) * 360 - 180;
  };

  const tileYToLat = (y: number, zoom: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  };

  const mapTiles = useMemo(() => {
    const centerX = lngToTileX(mapCenter.lng, mapZoom);
    const centerY = latToTileY(mapCenter.lat, mapZoom);
    const startX = Math.floor(centerX) - 1;
    const startY = Math.floor(centerY) - 1;
    const offsetX = (Math.floor(centerX) - centerX) * tileSize;
    const offsetY = (Math.floor(centerY) - centerY) * tileSize;
    const tiles = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const x = startX + col;
        const y = startY + row;
        tiles.push({
          key: `${x}-${y}`,
          x,
          y,
          left: `calc(50% + ${offsetX + (col - 1) * tileSize}px)`,
          top: `calc(50% + ${offsetY + (row - 1) * tileSize}px)`,
        });
      }
    }

    return tiles;
  }, [mapCenter.lat, mapCenter.lng, mapZoom]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // Only allow digits and limit to 10 characters
      const phoneValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData({ ...formData, [name]: phoneValue });
    } else if (name === 'latitude' || name === 'longitude') {
      setFormData({ ...formData, [name]: value });
      const nextLatitude = name === 'latitude' ? Number(value) : Number(formData.latitude);
      const nextLongitude = name === 'longitude' ? Number(value) : Number(formData.longitude);

      if (Number.isFinite(nextLatitude) && Number.isFinite(nextLongitude)) {
        setMapCenter({ lat: nextLatitude, lng: nextLongitude });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const selectLocation = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setFormData({
      ...formData,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    });
    setLocationStatus(`Selected location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerTileX = lngToTileX(mapCenter.lng, mapZoom);
    const centerTileY = latToTileY(mapCenter.lat, mapZoom);
    const clickedTileX = centerTileX + (e.clientX - rect.left - rect.width / 2) / tileSize;
    const clickedTileY = centerTileY + (e.clientY - rect.top - rect.height / 2) / tileSize;
    const lat = tileYToLat(clickedTileY, mapZoom);
    const lng = tileXToLng(clickedTileX, mapZoom);

    selectLocation(
      Math.max(-90, Math.min(90, lat)),
      Math.max(-180, Math.min(180, lng))
    );
    setError('');
  };

  const handleZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMapZoom((zoom) => Math.min(19, zoom + 1));
  };

  const handleZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setMapZoom((zoom) => Math.max(3, zoom - 1));
  };

  const handleUseCurrentLocation = () => {
    setError('');

    if (!navigator.geolocation) {
      setError('Your browser does not support current location.');
      return;
    }

    setLocationLoading(true);
    setLocationStatus('Requesting browser location permission...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectLocation(position.coords.latitude, position.coords.longitude);
        setLocationLoading(false);
      },
      (positionError) => {
        const message =
          positionError.code === positionError.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow location access or click on the map.'
            : 'Unable to fetch current location. Please click on the map to choose manually.';
        setError(message);
        setLocationStatus('Current location was not selected.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const handleFindOnMap = async () => {
    if (!fullAddress) {
      setError('Please enter address details before searching on map.');
      return;
    }

    setLocationLoading(true);
    setError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullAddress)}`
      );
      const results = await response.json();

      if (Array.isArray(results) && results.length > 0) {
        selectLocation(Number(results[0].lat), Number(results[0].lon));
      } else {
        setError('Location not found. Please click on the map to choose manually.');
        setLocationStatus('Address search did not return a location.');
      }
    } catch {
      setError('Unable to search location. Please click on the map to choose manually.');
      setLocationStatus('Address search failed.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Please choose a valid location on the map.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        address: fullAddress,
        latitude,
        longitude,
      };

      const response = await fetch(`${API_BASE_URL}/api/Admin/create`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('School created successfully!');
        onClose();
        setFormData({
          schoolName: '',
          street: '',
          city: '',
          pinCode: '',
          country: '',
          state: '',
          landmark: '',
          latitude: defaultLocation.lat.toFixed(6),
          longitude: defaultLocation.lng.toFixed(6),
          phone: '',
          email: '',
        });
        setMapCenter(defaultLocation);
        setMapZoom(17);
      } else {
        setError('Failed to create school');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-school-overlay" onClick={onClose}>
      <div className="create-school-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-school-header">
          <h2>Create New School</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>School Name *</label>
            <input
              type="text"
              name="schoolName"
              className="input"
              value={formData.schoolName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Street *</label>
              <input
                type="text"
                name="street"
                className="input"
                value={formData.street}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Landmark</label>
              <input
                type="text"
                name="landmark"
                className="input"
                value={formData.landmark}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Address Preview</label>
            <div className="address-preview">{fullAddress || 'Address will appear here'}</div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                className="input"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Pin Code *</label>
              <input
                type="text"
                name="pinCode"
                className="input"
                value={formData.pinCode}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Country *</label>
              <input
                type="text"
                name="country"
                className="input"
                value={formData.country}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                name="state"
                className="input"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="map-section">
            <div className="map-section-header">
              <label>School Location *</label>
              <div className="map-actions">
                <button type="button" className="btn btn-secondary btn-small" onClick={handleFindOnMap} disabled={locationLoading}>
                  Find Address
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={handleUseCurrentLocation} disabled={locationLoading}>
                  Current Location
                </button>
              </div>
            </div>
            <div
              className="school-map"
              onClick={handleMapClick}
            >
              <div className="satellite-tiles" aria-hidden="true">
                {mapTiles.map((tile) => (
                  <img
                    key={tile.key}
                    className="satellite-tile"
                    src={`https://api.maptiler.com/maps/hybrid/256/${mapZoom}/${tile.x}/${tile.y}.jpg?key=${mapTilerKey}`}
                    style={{ left: tile.left, top: tile.top }}
                    alt=""
                  />
                ))}
              </div>
              <div className="map-zoom-controls">
                <button type="button" onClick={handleZoomIn} aria-label="Zoom in">+</button>
                <button type="button" onClick={handleZoomOut} aria-label="Zoom out">-</button>
              </div>
              <div className="map-pin" />
              <span className="map-helper">Click map to choose school location</span>
            </div>
            <div className="location-status">{locationLoading ? 'Finding location...' : locationStatus}</div>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  name="latitude"
                  className="input"
                  value={formData.latitude}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  name="longitude"
                  className="input"
                  value={formData.longitude}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                className="input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter 10 digit phone number"
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                className="input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create School'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSchool;
