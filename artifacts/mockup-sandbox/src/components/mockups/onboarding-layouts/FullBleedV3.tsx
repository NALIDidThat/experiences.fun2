import React from "react";
import { ArrowRight } from "lucide-react";

export function FullBleedV3() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#f20789] via-pink-600 to-rose-700 flex flex-col items-center font-sans overflow-hidden relative">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08)_0%,transparent_70%)] pointer-events-none" />

      <div className="flex-[2] w-full" />

      <div className="flex flex-col items-center text-center w-full max-w-sm z-10 px-8">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.12] backdrop-blur-sm flex items-center justify-center text-4xl mb-8 ring-1 ring-white/[0.08]">
          ✨
        </div>

        <p className="text-white/50 text-sm font-medium tracking-widest uppercase mb-3">
          Welcome to
        </p>
        <h1 className="text-[2.25rem] font-extrabold text-white leading-none tracking-tight mb-5">
          experiences
          <span className="text-white/70">.fun</span>
        </h1>

        <p className="text-white/55 text-[0.9375rem] leading-relaxed max-w-[280px]">
          Join real-world experiences, connect with locals, and build your community reputation.
        </p>
      </div>

      <div className="flex-[3] w-full" />

      <div className="w-full px-6 pb-10 flex flex-col items-center gap-6 z-10">
        <button className="w-full max-w-sm h-[3.25rem] text-[0.9375rem] bg-white/[0.12] hover:bg-white/[0.18] backdrop-blur-sm text-white rounded-full ring-1 ring-white/20 font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          Start
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>

        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`rounded-full transition-all ${
                step === 1
                  ? "w-5 h-[3px] bg-white/90"
                  : "w-[3px] h-[3px] bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
