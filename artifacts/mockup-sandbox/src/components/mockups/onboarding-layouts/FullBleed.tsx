import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FullBleed() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-600 via-[#f20789] to-rose-600 flex flex-col items-center justify-between p-8 font-sans overflow-hidden relative">
      
      {/* Decorative ambient background elements */}
      <div className="absolute top-1/4 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl translate-x-1/3 pointer-events-none" />
      
      {/* Spacer for top */}
      <div className="flex-1 w-full" />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center text-center w-full max-w-sm z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-8xl mb-12 drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-110 transition-transform duration-500 cursor-default">
          ✨
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
          Welcome to<br />
          <span className="text-white drop-shadow-md">experiences.fun</span>
        </h1>
        
        <p className="text-white/80 text-lg md:text-xl leading-relaxed max-w-[280px] md:max-w-xs mx-auto font-medium">
          Join real-world experiences, connect with locals, and build your community reputation.
        </p>
      </div>

      {/* Spacer for bottom */}
      <div className="flex-1 w-full" />

      {/* Bottom Controls */}
      <div className="w-full max-w-sm flex flex-col items-center gap-8 pb-4 z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
        <Button 
          className="w-full h-16 text-xl bg-white hover:bg-white/95 text-[#f20789] rounded-full shadow-[0_8px_30px_rgb(242,7,137,0.3)] hover:shadow-[0_12px_40px_rgb(242,7,137,0.5)] transition-all duration-300 group font-bold"
        >
          Start
          <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1.5 transition-transform" />
        </Button>
        
        {/* Step Indicators */}
        <div className="flex justify-center gap-2.5">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-500 ${
                step === 1
                  ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
