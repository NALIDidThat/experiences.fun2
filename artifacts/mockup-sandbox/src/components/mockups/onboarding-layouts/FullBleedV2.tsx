import React from "react";
import { ArrowRight } from "lucide-react";

export function FullBleedV2() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#f20789] via-pink-600 to-rose-700 flex flex-col items-center p-6 pb-10 font-sans overflow-hidden relative">

      <div className="absolute top-[15%] -left-20 w-48 h-48 bg-white/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[25%] -right-16 w-56 h-56 bg-rose-400/[0.12] rounded-full blur-3xl pointer-events-none" />

      <div className="flex-[3] w-full" />

      <div className="flex flex-col items-center text-center w-full max-w-sm z-10">
        <div className="text-6xl mb-8 drop-shadow-[0_0_24px_rgba(255,255,255,0.3)]">
          ✨
        </div>

        <h1 className="text-[2rem] font-extrabold text-white mb-3 leading-[1.15] tracking-tight">
          Welcome to{" "}
          <span className="text-white/95 underline decoration-white/30 decoration-2 underline-offset-4">
            experiences.fun
          </span>
        </h1>

        <p className="text-white/65 text-base leading-relaxed max-w-[300px]">
          Join real-world experiences, connect with locals, and build your community reputation.
        </p>
      </div>

      <div className="flex-[4] w-full" />

      <div className="w-full max-w-sm flex flex-col items-center gap-5 z-10">
        <button className="w-full h-14 text-lg bg-white hover:bg-white/95 text-[#f20789] rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.12)] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          Start
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`rounded-full transition-all ${
                step === 1
                  ? "w-6 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
