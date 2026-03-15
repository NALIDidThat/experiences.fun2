import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompactTop() {
  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col font-sans max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Top Gradient Banner */}
      <div className="h-20 w-full bg-gradient-to-r from-pink-600 via-[#f20789] to-rose-600 flex items-center px-6 shadow-md z-10">
        {/* Step Indicators */}
        <div className="flex gap-1.5 w-full pt-4">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all ${
                step === 1
                  ? "w-8 bg-white"
                  : "w-full bg-white/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-8 z-20 bg-gray-50 rounded-t-3xl -mt-4 relative">
        
        {/* Header Section: Icon + Title + Subtitle */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-pink-100 text-[#f20789] rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm border border-pink-200">
              ✨
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight mb-2">
                Welcome to experiences.fun
              </h1>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Join real-world experiences, connect with locals, and build your community reputation.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          <div className="bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <span>🌍</span> Local Events
          </div>
          <div className="bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <span>⭐</span> Earn XP
          </div>
          <div className="bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-xl text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <span>👥</span> Community
          </div>
        </div>

        {/* Flexible space to push button to bottom */}
        <div className="flex-1" />

        {/* CTA Button at Bottom */}
        <div className="pt-8 w-full">
          <Button 
            className="w-full h-14 text-lg font-semibold bg-[#f20789] hover:bg-pink-600 text-white rounded-2xl group shadow-lg shadow-pink-200/50 transition-all active:scale-[0.98]"
          >
            Start
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
