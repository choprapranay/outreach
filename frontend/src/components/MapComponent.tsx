"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// You'll need to set your Mapbox token in an environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "your-mapbox-token-here";

// University of Toronto St. George coordinates
const UOFT_LAT = 43.6630;
const UOFT_LNG = -79.3960;

export interface Business {
  id: string;
  name: string;
  jobRole: string;
  status: string;
  lastContact: string;
  latitude: number;
  longitude: number;
}

interface MapComponentProps {
  userLocation?: { latitude: number; longitude: number } | null;
  searchRadius?: number;
  businesses?: Business[];
  selectedBusiness?: Business | null;
  onBusinessClick?: (business: Business) => void;
}

export default function MapComponent({ userLocation, searchRadius = 10, businesses = [], selectedBusiness, onBusinessClick }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const businessMarkers = useRef<mapboxgl.Marker[]>([]);
  const radiusCircle = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize Mapbox with Standard style (realistic 3D buildings) and label toggles
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard", // Standard style with realistic 3D
      config: {
        basemap: {
          lightPreset: "night", // Night mode
          show3dObjects: true,   // Keep 3D buildings geometry
          // Label visibility toggles — KEEP ONLY ROAD (street) LABELS
          showRoadLabels: true,
          showPlaceLabels: false,
          showPointOfInterestLabels: false,
          showTransitLabels: false,
          showLandmarkIcons: false,
          showLandmarkIconLabels: false,
        },
      },
      center: [UOFT_LNG, UOFT_LAT],
      zoom: 16,
      pitch: 50,
      bearing: -30,
      antialias: true,
      accessToken: MAPBOX_TOKEN,
    });

    // Ensure the same toggles are enforced after style load (defensive, e.g., on style reloads)
    map.current.on("style.load", () => {
      const m = map.current!;

      // Add terrain
      if (!m.getSource("mapbox-dem")) {
        m.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        } as any);
      }
      m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // Enforce label visibility (only street names)
      m.setConfigProperty("basemap", "showRoadLabels", true);
      m.setConfigProperty("basemap", "showPlaceLabels", false);
      m.setConfigProperty("basemap", "showPointOfInterestLabels", false);
      m.setConfigProperty("basemap", "showTransitLabels", false);
      m.setConfigProperty("basemap", "showLandmarkIcons", false);
      m.setConfigProperty("basemap", "showLandmarkIconLabels", false);

      // Create the pulse animation keyframes once
      if (!document.getElementById("user-location-pulse-style")) {
        const style = document.createElement("style");
        style.id = "user-location-pulse-style";
        style.textContent = `
          @keyframes pulse {
            0% { 
              box-shadow: 0 0 0 0 rgba(59,130,246,0.7), 0 0 0 0 rgba(59,130,246,0.5);
            }
            50% { 
              box-shadow: 0 0 0 8px rgba(59,130,246,0), 0 0 0 16px rgba(59,130,246,0.2);
            }
            100% { 
              box-shadow: 0 0 0 12px rgba(59,130,246,0), 0 0 0 24px rgba(59,130,246,0);
            }
          }
        `;
        document.head.appendChild(style);
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (userMarker.current) {
        userMarker.current.remove();
        userMarker.current = null;
      }
      businessMarkers.current.forEach((m) => m.remove());
      businessMarkers.current = [];
    };
  }, []);

  // Update user location marker
  useEffect(() => {
    if (!map.current) return;

    // Remove existing marker
    if (userMarker.current) {
      userMarker.current.remove();
      userMarker.current = null;
    }

    if (userLocation) {
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border: 3px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(59, 130, 246, 0.5);
        cursor: pointer;
        animation: pulse 2s infinite;
        transform: translate(-50%, -50%);
      `;

      userMarker.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map.current);

      map.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 17,
        duration: 2000,
      });
    }
  }, [userLocation]);

  // Update radius circle
  useEffect(() => {
    if (!map.current) return;
    if (!userLocation) return;
    if (!map.current.loaded()) return;

    console.log('Creating radius circle:', { userLocation, searchRadius });

    // Remove old source and layer if they exist
    if (map.current.getLayer('radius-circle')) {
      map.current.removeLayer('radius-circle');
    }
    if (map.current.getLayer('radius-circle-fill')) {
      map.current.removeLayer('radius-circle-fill');
    }
    if (map.current.getSource('radius-circle')) {
      map.current.removeSource('radius-circle');
    }

    // Create a circle source and layer for the radius
    const center = [userLocation.longitude, userLocation.latitude];
    
    // Convert radius from km to meters, then to degrees
    const radiusInMeters = searchRadius * 1000;
    const radiusInDegrees = radiusInMeters / 111320; // meters per degree at equator

    console.log('Radius in degrees:', radiusInDegrees);

    // Create circle coordinates
    const circle = [];
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const angle = (i * 360) / steps;
      const radians = angle * (Math.PI / 180);
      circle.push([
        center[0] + radiusInDegrees * Math.cos(radians),
        center[1] + radiusInDegrees * Math.sin(radians)
      ]);
    }
    circle.push(circle[0]); // Close the circle

    // Add source and layer for the radius circle
    map.current.addSource('radius-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circle]
        },
        properties: {}
      }
    });

    // Add fill layer first (semi-transparent)
    map.current.addLayer({
      id: 'radius-circle-fill',
      type: 'fill',
      source: 'radius-circle',
      paint: {
        'fill-color': '#60a5fa',
        'fill-opacity': 0.3
      }
    });

    // Add line layer for the circle outline - make it very visible
    map.current.addLayer({
      id: 'radius-circle',
      type: 'line',
      source: 'radius-circle',
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 1
      }
    });

    console.log('Radius circle layer added');
  }, [userLocation, searchRadius]);

  // Add business markers on map
  useEffect(() => {
    if (!map.current) return;

    // Remove existing business markers
    businessMarkers.current.forEach((marker) => marker.remove());
    businessMarkers.current = [];

    // Add markers for each business
    businesses.forEach((business) => {
      const el = document.createElement("div");
      
      // Determine color based on status
      const color = 
        business.status === "Hiring" ? "#10b981" :
        business.status === "Maybe" ? "#f59e0b" :
        business.status === "Not Hiring" ? "#ef4444" :
        "#6b7280";
      
      el.className = "business-marker";
      el.style.cssText = `
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid rgba(255, 255, 255, 0.95);
        cursor: pointer;
        box-shadow: 0 0 0 3px ${color}33, 0 4px 8px rgba(0,0,0,0.4);
      `;

      // Create popup element
      const popup = document.createElement("div");
      popup.className = "business-popup";
      popup.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 8px;
        padding: 10px 14px;
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        color: #e5e5e5;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
        z-index: 1000;
      `;
      
      // Add popup content
      popup.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px; color: #ffffff;">${business.name}</div>
        <div style="color: #a3a3a3; margin-bottom: 2px;">${business.jobRole}</div>
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          <span>${business.status}</span>
        </div>
        <div style="color: #a3a3a3; font-size: 11px;">Last: ${business.lastContact}</div>
      `;

      // Wrap element and popup in a container
      const container = document.createElement("div");
      container.style.cssText = `
        position: relative;
        display: inline-block;
      `;
      container.appendChild(el);
      container.appendChild(popup);

      // Add hover effects
      el.addEventListener("mouseenter", () => {
        popup.style.opacity = "1";
      });
      
      el.addEventListener("mouseleave", () => {
        popup.style.opacity = "0";
      });

      el.addEventListener("click", () => {
        onBusinessClick?.(business);
      });

      const marker = new mapboxgl.Marker(container)
        .setLngLat([business.longitude, business.latitude])
        .addTo(map.current!);

      businessMarkers.current.push(marker);
    });
  }, [businesses, onBusinessClick]);

  // Zoom to selected business
  useEffect(() => {
    if (!map.current) return;
    if (!selectedBusiness) return;

    // Fly to the selected business location
    map.current.flyTo({
      center: [selectedBusiness.longitude, selectedBusiness.latitude],
      zoom: 18,
      duration: 1500,
    });
  }, [selectedBusiness]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
