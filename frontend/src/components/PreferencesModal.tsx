"use client";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
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
          <div>
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="location">
              Location
            </label>
            <input
              className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] placeholder-[#a3a3a3]/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              id="location"
              placeholder="City, State, Country"
              type="text"
            />
          </div>

          {/* Search Radius */}
          <div>
            <label className="text-sm font-medium text-[#a3a3a3]" htmlFor="radius">
              Search Radius
            </label>
            <select
              className="mt-2 w-full bg-[#0a0a0a] border border-[#262626] rounded-md py-2 px-3 text-[#e5e5e5] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              id="radius"
            >
              <option>5 miles</option>
              <option selected>10 miles</option>
              <option>25 miles</option>
              <option>50 miles</option>
              <option>100 miles</option>
            </select>
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
