"use client";

import { useState, useEffect } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationUpdate?: (location: { latitude: number; longitude: number } | null) => void;
  onRadiusUpdate?: (radius: number) => void;
}

interface AddressSuggestion {
  place_name: string;
  center: [number, number];
}

export default function PreferencesModal({ isOpen, onClose, onLocationUpdate, onRadiusUpdate }: PreferencesModalProps) {
  const [radius, setRadius] = useState(10);
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch address suggestions from Mapbox Geocoding API
  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=address,poi&limit=5`
      );
      const data = await response.json();
      
      if (data.features) {
        setSuggestions(data.features.map((feature: any) => ({
          place_name: feature.place_name,
          center: feature.center
        })));
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  // Handle location input change
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    fetchAddressSuggestions(value);
    setShowSuggestions(value.length > 0);
  };

  // Handle address selection from dropdown
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setLocation(suggestion.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Update map with selected location
    if (onLocationUpdate) {
      onLocationUpdate({
        latitude: suggestion.center[1],
        longitude: suggestion.center[0]
      });
    }
  };

  const handleUseCurrentLocation = () => {
    setIsGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Update location text - try to get address from coordinates
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          // Pass location to parent component
          if (onLocationUpdate) {
            onLocationUpdate({ latitude, longitude });
          }
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsGettingLocation(false);
          alert("Failed to get your current location. Please enable location services.");
        }
      );
    } else {
      setIsGettingLocation(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal content */}
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-xl border border-[#262626] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#262626]">
          <h3 className="text-lg font-semibold text-[#e5e5e5]">Preferences</h3>
          <p className="text-sm text-[#a3a3a3] mt-1">Adjust your job search criteria.</p>
        </div>

        {/* Form content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Preferred Roles */}
          <div>
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="roles">
              Preferred Roles
            </label>
            <input
              className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] placeholder-[#a3a3a3]/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              id="roles"
              placeholder="e.g., Software Engineer, Medical Assistant"
              type="text"
            />
          </div>

          {/* Location */}
          <div className="relative">
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="location">
              Location
            </label>
            <div className="relative">
              <input
                className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] placeholder-[#a3a3a3]/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                id="location"
                placeholder="Start typing your address..."
                type="text"
                value={location}
                onChange={handleLocationChange}
                onFocus={() => setShowSuggestions(location.length > 0)}
              />
              
              {/* Address suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-[#262626] rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddressSelect(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-[#1a1a1a] text-[#e5e5e5] text-sm border-b border-[#262626] last:border-b-0"
                    >
                      <span className="material-icons text-base inline-block mr-2 text-blue-500">location_on</span>
                      {suggestion.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="mt-2 text-sm text-blue-500 hover:text-blue-400 disabled:text-[#a3a3a3] disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <span className="material-icons text-base">my_location</span>
              <span>{isGettingLocation ? "Getting location..." : "Use current location"}</span>
            </button>
            <p className="mt-1 text-xs text-[#a3a3a3]/70">Enter your address or use current location</p>
          </div>

          {/* Search Radius */}
          <div>
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="radius">
              Search Radius: {radius} km
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={radius}
              onChange={(e) => {
                const newRadius = Number(e.target.value);
                setRadius(newRadius);
                if (onRadiusUpdate) {
                  onRadiusUpdate(newRadius);
                }
              }}
              className="mt-2 w-full h-2 bg-[#0a0a0a] rounded-lg appearance-none cursor-pointer slider"
              id="radius"
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
              }
              .slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3b82f6;
                cursor: pointer;
                border: none;
              }
            `}</style>
          </div>

          {/* Employment Type */}
          <div>
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="employment-type">
              Employment Type
            </label>
            <select
              className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              id="employment-type"
            >
              <option>Any</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </select>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-6 bg-[#0a0a0a]/50 rounded-b-xl border-t border-[#262626] flex justify-end items-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#a3a3a3] bg-transparent rounded-md hover:bg-[#1a1a1a]"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center space-x-2"
          >
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
