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
    // Demo placeholder business - always appears first
    const demoBosonAI: Business = {
        id: "demo-bosonai",
        name: "BosonAI",
        jobRole: "Technology",
        status: "Unknown",
        lastContact: "—",
        latitude: 43.6614914,
        longitude: -79.3877483,
        address: "2 Carleton Street, Toronto",
        phone: "+12897950739",
    };

    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(false);

    // Helper function to calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
    };

    // Fetch businesses from FastAPI backend
    const handleSearch = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                location: address,
                radius: radius.toString(),
            });
            if (keyword) params.append("keyword", keyword);

            const res = await fetch(`http://127.0.0.1:8001/places?${params.toString()}`);
            const data = await res.json();

            if (res.ok && data && Array.isArray(data.results)) {
                const formatted: Business[] = data.results
                    .map((b: BackendBusiness, i: number) => ({
                        id: `${b.name}-${i}`,
                        name: b.name,
                        jobRole: keyword || "N/A",
                        status: "Unknown",
                        lastContact: "—",
                        latitude: b.lat,
                        longitude: b.lng,
                        address: b.address,
                        phone: b.phone,
                    }))
                    .filter((b: Business) => {
                        // 1. Exclude businesses without phone numbers
                        if (!b.phone || b.phone === "N/A" || b.phone === "incorrect format") {
                            return false;
                        }

                        // 2. Only include businesses within the specified radius
                        const distance = calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            b.latitude,
                            b.longitude
                        );
                        return distance <= radius;
                    });

                // Always keep BosonAI demo at the top
                setBusinesses([demoBosonAI, ...formatted]);
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

    // Poll for call status and update business when complete
    const pollCallStatus = async (callSid: string, businessId: string) => {
        const maxAttempts = 60; // Poll for up to 5 minutes
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`http://localhost:8002/call-status/${callSid}`);
                
                if (response.ok) {
                    const callData = await response.json();
                    console.log(`📊 Call status: ${callData.status}, Hiring: ${callData.hiring_status}`);
                    
                    if (callData.status === 'COMPLETED' && callData.hiring_status) {
                        // Update the business in the table
                        setBusinesses(prev => prev.map(business => {
                            if (business.id === businessId) {
                                const hiringStatus = 
                                    callData.hiring_status === 'HIRING' ? 'Hiring' :
                                    callData.hiring_status === 'NOT_HIRING' ? 'Not Hiring' :
                                    'Uncertain';
                                
                                const verifiedDate = callData.completed_at 
                                    ? new Date(callData.completed_at).toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })
                                    : new Date().toLocaleDateString('en-US', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    });
                                
                                return {
                                    ...business,
                                    status: hiringStatus,
                                    lastVerified: verifiedDate
                                };
                            }
                            return business;
                        }));
                        
                        // Silently update - no alert
                        console.log(`✅ Call complete! ${businessId} hiring status: ${callData.hiring_status}`);
                        return; // Stop polling
                    }
                }
                
                // Continue polling if not complete and haven't exceeded max attempts
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Poll every 5 seconds
                }
            } catch (error) {
                console.error("Error polling call status:", error);
            }
        };
        
        poll();
    };

    // Call button action - trigger AI call automation
    const handleCall = async (b: Business) => {
        if (!b.phone || b.phone === "N/A") {
            return;
        }

        try {
            // Create form data to send phone number and business info
            const formData = new FormData();
            formData.append("phone_number", b.phone);
            formData.append("business_name", b.name);
            formData.append("role", keyword || b.jobRole || "positions");
            formData.append("employment_type", "Full-time");
            formData.append("location", address || "your area");

            const response = await fetch("http://localhost:8002/make-call", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Start polling for call results silently
                pollCallStatus(data.call_sid, b.id);
            }
        } catch (error) {
            console.error("Call error:", error);
        }
    };

  return (
        <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Preferences Modal */}
                <PreferencesModal
                    isOpen={isPreferencesOpen}
                    onClose={() => setIsPreferencesOpen(false)}
                    onLocationUpdate={(loc: string, coords?: { latitude: number; longitude: number }) => {
                        setAddress(loc);
                        if (coords) {
                            setUserLocation(coords);
                        }
                    }}
                    onRadiusUpdate={(r: number) => setRadius(r)}
                    onKeywordUpdate={(k: string) => setKeyword(k)}
                />

                {/* Header */}
                <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-[100rem]">
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
                    className={`absolute left-1/2 -translate-x-1/2 w-[96%] max-w-[100rem] z-10 ${
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
                                    <th className="px-6 py-3">Last Verified</th>
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
                                            <td className="px-6 py-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    b.status === 'Hiring' 
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                                        : b.status === 'Not Hiring'
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                                        : b.status === 'Uncertain'
                                                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                                        : 'text-[#a3a3a3]'
                                                }`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-[#a3a3a3]">{b.lastVerified || "—"}</td>
                                            <td className="px-6 py-3 text-right text-[#a3a3a3]">{b.address}</td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCall(b);
                                                    }}
                                                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600"
                                                >
                                                    Call
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-3 text-center text-[#666]">
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
