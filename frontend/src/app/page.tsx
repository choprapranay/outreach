"use client";

import { useState } from "react";
import PreferencesModal from "@/components/PreferencesModal";
import MapComponent, { Business } from "@/components/MapComponent";

interface BackendBusiness {
    name: string;
    address: string;
    lat: number;
    lng: number;
    phone: string;
}

export default function Home() {
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [isTableExpanded, setIsTableExpanded] = useState(false);
    const [address, setAddress] = useState("Toronto, ON");
    const [radius, setRadius] = useState(3000);
    const [keyword, setKeyword] = useState("");
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
        latitude: 43.6532,
        longitude: -79.3832,
    });
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch businesses from FastAPI backend
    const handleSearch = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                location: address,
                radius: radius.toString(),
            });
            if (keyword) params.append("keyword", keyword);

            const res = await fetch(`http://127.0.0.1:8000/places?${params.toString()}`);
            const data = await res.json();

            if (res.ok && data && Array.isArray(data.results)) {
                const formatted: Business[] = data.results.map((b: BackendBusiness, i: number) => ({
                    id: `${b.name}-${i}`,
                    name: b.name,
                    jobRole: keyword || "N/A",
                    status: "Unknown",
                    lastContact: "—",
                    latitude: b.lat,
                    longitude: b.lng,
                    address: b.address,
                    phone: b.phone,
                }));

                // recenter map around businesses
                if (formatted.length > 0) {
                    const avgLat = formatted.reduce((s, f) => s + f.latitude, 0) / formatted.length;
                    const avgLng = formatted.reduce((s, f) => s + f.longitude, 0) / formatted.length;
                    setUserLocation({ latitude: avgLat, longitude: avgLng });
                }

                setBusinesses(formatted);
            } else {
                console.error("Unexpected response format:", data);
                setBusinesses([]);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
            setBusinesses([]);
        } finally {
            setLoading(false);
        }
    };

    // Call button action
    const handleCall = (b: Business) => {
        if (b.phone && b.phone !== "N/A") {
            window.open(`tel:${b.phone}`);
        } else {
            alert("No phone number available for this business.");
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Preferences Modal */}
                <PreferencesModal
                    isOpen={isPreferencesOpen}
                    onClose={() => setIsPreferencesOpen(false)}
                    onLocationUpdate={(loc: string) => setAddress(loc)}
                    onRadiusUpdate={(r: number) => setRadius(r)}
                    onKeywordUpdate={(k: string) => setKeyword(k)}
                />

                {/* Header */}
                <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-7xl">
                    <div className="bg-[#111111]/80 backdrop-blur-md rounded-xl shadow-2xl p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <div className="text-xl font-medium text-white ml-[10px]">outreach</div>
                        </div>

                        <div className="flex items-center space-x-2">
                            {/* Search Button */}
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-500/20 rounded-md hover:bg-blue-500/30 flex items-center space-x-2"
                            >
                                <span className="material-icons text-base">search</span>
                                <span>{loading ? "Searching..." : "Start search"}</span>
                            </button>

                            {/* Run New Calls Button */}
                            <button
                                onClick={() => alert("TODO: implement auto-call batch logic")}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-700 flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                            >
                                <span className="material-icons text-base">phone_in_talk</span>
                                <span>Run New Calls</span>
                            </button>

                            {/* Settings Button */}
                            <button
                                onClick={() => setIsPreferencesOpen(true)}
                                className="p-2 rounded-lg text-[#a3a3a3] hover:bg-[#0a0a0a]"
                            >
                                <span className="material-icons text-xl">settings</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Map */}
                <main className="flex-1 flex overflow-hidden">
                    <div className="flex-1 relative">
                        <MapComponent
                            userLocation={userLocation}
                            searchRadius={radius}
                            businesses={businesses}
                            selectedBusiness={selectedBusiness}
                            onBusinessClick={(b) => setSelectedBusiness(b)}
                        />
                    </div>
                </main>

                {/* Business Table */}
                <div
                    className={`absolute left-1/2 -translate-x-1/2 w-[96%] max-w-7xl z-10 ${
                        isTableExpanded
                            ? "top-[calc(2.5rem+4rem)] bottom-0 rounded-t-xl"
                            : "bottom-2 rounded-xl"
                    }`}
                >
                    <div className="bg-[#111111]/80 backdrop-blur-md shadow-2xl flex flex-col h-full rounded-xl">
                        <div className="p-4 flex justify-between items-center flex-shrink-0">
                            <h2 className="font-semibold">Businesses</h2>
                            <button
                                onClick={() => setIsTableExpanded(!isTableExpanded)}
                                className="p-1 rounded-md hover:bg-[#0a0a0a] text-[#a3a3a3]"
                            >
                <span className="material-icons text-xl">
                  {isTableExpanded ? "unfold_more" : "unfold_less"}
                </span>
                            </button>
                        </div>

                        <div
                            className={`${
                                !isTableExpanded ? "max-h-[140px] overflow-y-auto" : "overflow-auto flex-1"
                            }`}
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-[#a3a3a3] uppercase sticky top-0 bg-[#111111]/80 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-3">Business Name</th>
                                    <th className="px-6 py-3">Job Role</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Address</th>
                                    <th className="px-6 py-3 text-center">Call</th>
                                </tr>
                                </thead>
                                <tbody>
                                {businesses.length > 0 ? (
                                    businesses.map((b) => (
                                        <tr
                                            key={b.id}
                                            className={`border-t border-[#262626] hover:bg-[#0a0a0a]/50 cursor-pointer ${
                                                selectedBusiness?.id === b.id ? "bg-blue-500/20" : ""
                                            }`}
                                            onClick={() => setSelectedBusiness(b)}
                                        >
                                            <td className="px-6 py-3 font-medium">{b.name}</td>
                                            <td className="px-6 py-3 text-[#a3a3a3]">{b.jobRole}</td>
                                            <td className="px-6 py-3 text-[#a3a3a3]">{b.status}</td>
                                            <td className="px-6 py-3 text-right text-[#a3a3a3]">{b.address}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCall(b);
                                                    }}
                                                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600"
                                                >
                                                    {b.phone && b.phone !== "N/A" ? `Call` : "No Number"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-3 text-center text-[#666]">
                                            {loading ? "Fetching results..." : "No businesses found. Try a new search."}
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
