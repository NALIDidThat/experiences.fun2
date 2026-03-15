import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function SplitScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col font-sans bg-white">
      {/* Top Section (Brand Identity) ~40% */}
      <div className="relative flex-shrink-0 flex flex-col h-[40vh] bg-gradient-to-br from-pink-600 via-[#f20789] to-rose-600 px-6 py-8 justify-between overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 text-6xl opacity-20 transform rotate-12">✨</div>
        <div className="absolute bottom-10 -left-6 text-7xl opacity-20 transform -rotate-12">🌍</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl drop-shadow-2xl animate-pulse duration-3000">✨</div>

        {/* Step Indicators at the very top */}
        <div className="flex justify-center gap-2 relative z-10">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === 1 ? "w-8 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Brand Name */}
        <div className="relative z-10 flex flex-col items-center mb-4">
          <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">
            experiences.fun
          </h1>
        </div>
      </div>

      {/* Bottom Section (Content/Action) ~60% */}
      <div className="flex-1 flex flex-col px-8 py-10 bg-white justify-between">
        <div className="flex flex-col gap-6 mt-4">
          <h2 className="text-4xl font-extrabold text-gray-900 leading-tight">
            Welcome to <span className="text-[#f20789]">experiences.fun</span>
          </h2>
          <p className="text-xl text-gray-500 leading-relaxed font-medium">
            Join real-world experiences, connect with locals, and build your community reputation.
          </p>
        </div>

        <div className="mt-12 pb-8">
          <Button 
            className="w-full h-16 text-lg font-bold bg-[#f20789] hover:bg-pink-700 text-white rounded-2xl shadow-xl shadow-pink-200 group transition-all"
          >
            Start
            <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}