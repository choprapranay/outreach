"use client";

import { useState } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface PreferencesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationUpdate: (address: string) => void;
    onRadiusUpdate: (radius: number) => void;
    onKeywordUpdate: (keyword: string) => void;
}

interface AddressSuggestion {
    place_name: string;
}

export default function PreferencesModal({
                                             isOpen,
                                             onClose,
                                             onLocationUpdate,
                                             onRadiusUpdate,
                                             onKeywordUpdate,
                                         }: PreferencesModalProps) {
    const [address, setAddress] = useState("");
    const [radius, setRadius] = useState(5); // km
    const [keyword, setKeyword] = useState("");
    const [employmentType, setEmploymentType] = useState("Any");
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const fetchAddressSuggestions = async (query: string) => {
        if (query.length < 3) return setSuggestions([]);
        try {
            const res = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                    query
                )}.json?access_token=${MAPBOX_TOKEN}&types=address,poi&limit=5`
            );
            const data = await res.json();
            if (data.features)
                setSuggestions(data.features.map((f: any) => ({ place_name: f.place_name })));
        } catch (err) {
            console.error("Error fetching suggestions:", err);
        }
    };

    const handleAddressSelect = (addr: string) => {
        setAddress(addr);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleUseCurrentLocation = () => {
        setIsGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                    setIsGettingLocation(false);
                    // optional future: reverse-geocode this into a readable address
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setIsGettingLocation(false);
                    alert("Failed to get your current location. Please enable location services.");
                }
            );
        } else {
            alert("Geolocation is not supported by your browser.");
            setIsGettingLocation(false);
        }
    };

    const handleApply = () => {
        onLocationUpdate(address);
        onRadiusUpdate(radius * 1000); // convert km to meters
        onKeywordUpdate(keyword);
        onClose();
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

                {/* Body */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Keyword / Role */}
                    <div>
                        <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="roles">
                            Preferred Roles
                        </label>
                        <input
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] placeholder-[#a3a3a3]/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            id="roles"
                            placeholder="e.g., restaurant, retail, barista..."
                            type="text"
                        />
                    </div>

                    {/* Location Input */}
                    <div className="relative">
                        <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="location">
                            Location
                        </label>
                        <div className="relative">
                            <input
                                id="location"
                                value={address}
                                onChange={(e) => {
                                    setAddress(e.target.value);
                                    fetchAddressSuggestions(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                placeholder="Start typing your address..."
                                className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-[#262626] rounded-md shadow-lg max-h-48 overflow-y-auto">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAddressSelect(s.place_name)}
                                            className="w-full text-left px-4 py-2 hover:bg-[#1a1a1a] text-[#e5e5e5] text-sm border-b border-[#262626] last:border-b-0"
                                        >
                      <span className="material-icons text-base inline-block mr-2 text-blue-500">
                        location_on
                      </span>
                                            {s.place_name}
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
                        <p className="mt-1 text-xs text-[#a3a3a3]/70">
                            Enter your address or use current location
                        </p>
                    </div>

                    {/* Radius Slider */}
                    <div>
                        <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="radius">
                            Search Radius: {radius} km
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={radius}
                            onChange={(e) => setRadius(Number(e.target.value))}
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
                            id="employment-type"
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                            className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option>Any</option>
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Contract</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#0a0a0a]/50 rounded-b-xl border-t border-[#262626] flex justify-end items-center space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-[#a3a3a3] bg-transparent rounded-md hover:bg-[#1a1a1a]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center space-x-2"
                    >
                        <span>Save Preferences</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
