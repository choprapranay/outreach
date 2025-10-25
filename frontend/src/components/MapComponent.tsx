"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export interface Business {
    id: string;
    name: string;
    jobRole: string;
    status: string;
    lastContact: string;
    lastVerified?: string;
    latitude: number;
    longitude: number;
    address?: string;
    phone?: string;
}

interface MapComponentProps {
    userLocation?: { latitude: number; longitude: number } | null;
    searchRadius?: number; // in meters
    businesses?: Business[];
    selectedBusiness?: Business | null;
    onBusinessClick?: (business: Business) => void;
}

export default function MapComponent({
                                         userLocation,
                                         searchRadius = 3000,
                                         businesses = [],
                                         selectedBusiness,
                                         onBusinessClick,
                                     }: MapComponentProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const userMarker = useRef<mapboxgl.Marker | null>(null);
    const businessMarkers = useRef<mapboxgl.Marker[]>([]);
    const [mapReady, setMapReady] = useState(false);

    // ---- Initialize map (Mapbox Standard Night) ----
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/standard",
            config: {
                basemap: {
                    lightPreset: "night",
                    show3dObjects: true,
                    showRoadLabels: true,
                    showPlaceLabels: false,
                    showPointOfInterestLabels: false,
                    showTransitLabels: false,
                    showLandmarkIcons: false,
                    showLandmarkIconLabels: false,
                },
            },
            center: [-79.396, 43.663],
            zoom: 15,
            pitch: 50,
            bearing: -30,
            antialias: true,
        });

        map.current.on("style.load", () => {
            setMapReady(true);

            // Add terrain
            if (!map.current!.getSource("mapbox-dem")) {
                map.current!.addSource("mapbox-dem", {
                    type: "raster-dem",
                    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                    tileSize: 512,
                    maxzoom: 14,
                } as any);
                map.current!.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
            }

            // enforce label visibility
            map.current!.setConfigProperty("basemap", "showRoadLabels", true);
            map.current!.setConfigProperty("basemap", "showPlaceLabels", false);
            map.current!.setConfigProperty("basemap", "showPointOfInterestLabels", false);
            map.current!.setConfigProperty("basemap", "showTransitLabels", false);
            map.current!.setConfigProperty("basemap", "showLandmarkIcons", false);
            map.current!.setConfigProperty("basemap", "showLandmarkIconLabels", false);

            // pulse animation once
            if (!document.getElementById("pulse-style")) {
                const style = document.createElement("style");
                style.id = "pulse-style";
                style.textContent = `
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
            70% { box-shadow: 0 0 0 20px rgba(59,130,246,0); }
            100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
          }
        `;
                document.head.appendChild(style);
            }
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // ---- Update user marker + fly ----
    useEffect(() => {
        if (!map.current || !mapReady || !userLocation) return;

        userMarker.current?.remove();

        const el = document.createElement("div");
        el.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg,#3b82f6,#2563eb);
      border: 3px solid white;
      box-shadow: 0 0 0 6px rgba(59,130,246,0.3);
      animation: pulse 2s infinite;
      transform: translate(-50%, -50%);
    `;
        userMarker.current = new mapboxgl.Marker(el)
            .setLngLat([userLocation.longitude, userLocation.latitude])
            .addTo(map.current);

        map.current.flyTo({
            center: [userLocation.longitude, userLocation.latitude],
            zoom: 15,
            duration: 1500,
        });
    }, [userLocation, mapReady]);

    // ---- Draw radius circle ----
    useEffect(() => {
        if (!map.current || !mapReady || !userLocation) return;

        const m = map.current;
        const { longitude, latitude } = userLocation;

        if (m.getLayer("radius-outline")) m.removeLayer("radius-outline");
        if (m.getLayer("radius-fill")) m.removeLayer("radius-fill");
        if (m.getSource("radius-area")) m.removeSource("radius-area");

        const circleData = createGeoJSONCircle([longitude, latitude], searchRadius);

        m.addSource("radius-area", { type: "geojson", data: circleData });

        m.addLayer({
            id: "radius-fill",
            type: "fill",
            source: "radius-area",
            paint: {
                "fill-color": "#3b82f6",
                "fill-opacity": 0.25,
            },
        });

        m.addLayer({
            id: "radius-outline",
            type: "line",
            source: "radius-area",
            paint: {
                "line-color": "#3b82f6",
                "line-width": 2,
            },
        });
    }, [userLocation, searchRadius, mapReady]);

    // ---- Helper to create accurate GeoJSON circle ----
    const createGeoJSONCircle = (center: [number, number], radiusMeters: number) => {
        const points = 64;
        const coords = [];
        const R = 6378137;
        const d = radiusMeters / R;

        for (let i = 0; i <= points; i++) {
            const bearing = (i * 2 * Math.PI) / points;
            const lat1 = (center[1] * Math.PI) / 180;
            const lon1 = (center[0] * Math.PI) / 180;

            const lat2 = Math.asin(
                Math.sin(lat1) * Math.cos(d) +
                Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
            );
            const lon2 =
                lon1 +
                Math.atan2(
                    Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
                    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
                );

            coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
        }

        return {
            type: "Feature" as const,
            properties: {},
            geometry: {
                type: "Polygon" as const,
                coordinates: [coords],
            },
        };
    };

    // ---- Business markers ----
    useEffect(() => {
        if (!map.current || !mapReady) return;

        businessMarkers.current.forEach((m) => m.remove());
        businessMarkers.current = [];

        businesses.forEach((b) => {
            const color =
                b.status === "Hiring"
                    ? "#10b981"
                    : b.status === "Maybe"
                        ? "#f59e0b"
                        : b.status === "Not Hiring"
                            ? "#ef4444"
                            : "#6b7280";

            const el = document.createElement("div");
            el.style.cssText = `
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        cursor: pointer;
      `;
            el.addEventListener("click", () => onBusinessClick?.(b));

            const marker = new mapboxgl.Marker(el)
                .setLngLat([b.longitude, b.latitude])
                .addTo(map.current!);

            businessMarkers.current.push(marker);
        });
    }, [businesses, mapReady]);

    // ---- Zoom to selected business ----
    useEffect(() => {
        if (!map.current || !mapReady || !selectedBusiness) return;
        map.current.flyTo({
            center: [selectedBusiness.longitude, selectedBusiness.latitude],
            zoom: 17,
            duration: 1200,
        });
    }, [selectedBusiness, mapReady]);

    return <div ref={mapContainer} className="w-full h-full" />;
}
