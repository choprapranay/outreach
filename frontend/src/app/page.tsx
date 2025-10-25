"use client";

import { useState } from "react";
import PreferencesModal from "@/components/PreferencesModal";
import MapComponent, { Business } from "@/components/MapComponent";

// Sample businesses data
const sampleBusinesses: Business[] = [
  {
    id: "1",
    name: "Harbor Clinic",
    jobRole: "Medical Assistant",
    status: "Hiring",
    lastContact: "3 Apr",
    latitude: 43.6630,
    longitude: -79.3950
  },
  {
    id: "2",
    name: "Oak & Iron Barbers",
    jobRole: "Barber",
    status: "Hiring",
    lastContact: "1 Apr",
    latitude: 43.6640,
    longitude: -79.3940
  },
  {
    id: "3",
    name: "Pinegrove Market",
    jobRole: "Servers",
    status: "Maybe",
    lastContact: "9 Apr",
    latitude: 43.6620,
    longitude: -79.3960
  },
  {
    id: "4",
    name: "Riverstone Cafe",
    jobRole: "N/A",
    status: "Not Hiring",
    lastContact: "11 Apr",
    latitude: 43.6650,
    longitude: -79.3930
  },
  {
    id: "5",
    name: "Kinetic Design",
    jobRole: "Software Engineer",
    status: "Contacted",
    lastContact: "12 Apr",
    latitude: 43.6610,
    longitude: -79.3970
  }
];

export default function Home() {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 43.6532,
    longitude: -79.3832
  }); // Default to University of Toronto St. George
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [searchRadius, setSearchRadius] = useState(10); // Default radius in km

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Preferences Modal */}
        <PreferencesModal 
          isOpen={isPreferencesOpen} 
          onClose={() => setIsPreferencesOpen(false)}
          onLocationUpdate={(location) => setUserLocation(location)}
          onRadiusUpdate={(radius) => setSearchRadius(radius)}
        />

        {/* Header */}
        <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[96%] max-w-7xl">
          <div className="bg-[#111111]/80 backdrop-blur-md rounded-xl shadow-2xl p-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Logo */}
              <div className="text-xl font-medium text-white ml-[10px]">
                outreach
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Search Button */}
              <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-500/20 rounded-md hover:bg-blue-500/30 flex items-center space-x-2">
                <span className="material-icons text-base">search</span>
                <span>Start search</span>
              </button>
              {/* Run New Calls Button */}
              <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-700 flex items-center space-x-2 shadow-lg shadow-blue-500/20">
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

        {/* Main Content Area - Map */}
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative">
            <MapComponent 
              userLocation={userLocation}
              searchRadius={searchRadius}
              businesses={sampleBusinesses}
              selectedBusiness={selectedBusiness}
              onBusinessClick={(business) => setSelectedBusiness(business)}
            />
          </div>
        </main>

        {/* Business Table */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 w-[96%] max-w-7xl z-10 ${
            isTableExpanded 
              ? 'top-[calc(2.5rem+4rem)] bottom-0 rounded-t-xl' 
              : 'bottom-2 rounded-xl'
          }`}
        >
          <div className="bg-[#111111]/80 backdrop-blur-md shadow-2xl flex flex-col h-full rounded-xl">
            {/* Table Header */}
            <div className="p-4 flex justify-between items-center flex-shrink-0">
              <h2 className="font-semibold">Businesses</h2>
              <button 
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                className="p-1 rounded-md hover:bg-[#0a0a0a] text-[#a3a3a3]"
              >
                <span className="material-icons text-xl">
                  {isTableExpanded ? 'unfold_more' : 'unfold_less'}
                </span>
              </button>
            </div>

            {/* Table */}
            <div className={`${!isTableExpanded ? 'max-h-[140px] overflow-y-auto' : 'overflow-auto flex-1'}`}>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-[#a3a3a3] uppercase sticky top-0 bg-[#111111]/80 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-3" scope="col">Business Name</th>
                    <th className="px-6 py-3" scope="col">Job Role</th>
                    <th className="px-6 py-3" scope="col">Status</th>
                    <th className="px-6 py-3 text-right" scope="col">Last Contact</th>
                    <th className="px-6 py-3 text-center" scope="col">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleBusinesses.map((business) => (
                    <tr 
                      key={business.id}
                      className={`border-t border-[#262626] hover:bg-[#0a0a0a]/50 cursor-pointer ${
                        selectedBusiness?.id === business.id ? 'bg-blue-500/20' : ''
                      }`}
                      onClick={() => setSelectedBusiness(business)}
                    >
                      <th className="px-6 py-3 font-medium text-[#e5e5e5]" scope="row">{business.name}</th>
                      <td className="px-6 py-3 text-[#a3a3a3]">{business.jobRole}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            business.status === 'Hiring' ? 'bg-green-500' :
                            business.status === 'Maybe' ? 'bg-yellow-500' :
                            business.status === 'Not Hiring' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></span>
                          <span>{business.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[#a3a3a3] text-right">{business.lastContact}</td>
                      <td className="px-6 py-3 text-center">
                        <button className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600">
                          Send call
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
