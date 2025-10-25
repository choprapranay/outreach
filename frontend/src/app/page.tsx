"use client";

import { useState } from "react";
import PreferencesModal from "@/components/PreferencesModal";

export default function Home() {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-[#e5e5e5]">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Preferences Modal */}
        <PreferencesModal 
          isOpen={isPreferencesOpen} 
          onClose={() => setIsPreferencesOpen(false)} 
        />

        {/* Header */}
        <header className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-5xl">
          <div className="bg-[#111111]/80 backdrop-blur-md rounded-xl shadow-2xl p-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Logo */}
              <div className="text-xl font-medium text-white">
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
              {/* Logout Button */}
              <button className="p-2 rounded-lg text-[#a3a3a3] hover:bg-[#0a0a0a]">
                <span className="material-icons text-xl">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area - Blank Dark Grey Background */}
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-[#111111] relative">
            {/* Blank dark grey background - map will be added later */}
          </div>
        </main>

        {/* Business Table */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-10">
          <div className="bg-[#111111]/80 backdrop-blur-md rounded-xl shadow-2xl">
            {/* Table Header */}
            <div className="p-4 flex justify-between items-center">
              <h2 className="font-semibold">Businesses</h2>
              <button className="p-1 rounded-md hover:bg-[#0a0a0a] text-[#a3a3a3]">
                <span className="material-icons text-xl">unfold_less</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-[#a3a3a3] uppercase">
                  <tr>
                    <th className="px-6 py-3" scope="col">Business Name</th>
                    <th className="px-6 py-3" scope="col">Job Role</th>
                    <th className="px-6 py-3" scope="col">Status</th>
                    <th className="px-6 py-3 text-right" scope="col">Last Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Table data will be populated from backend */}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
