import React from "react";
import { Link, useRoute } from "wouter";
import { Home, UserCircle, Compass, Swords, Info } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const hasSession = isAuthenticated();
  const [isHome] = useRoute("/home");
  const [isExperiences] = useRoute("/experiences");
  const [isChallenges] = useRoute("/challenges");
  const [isProfile] = useRoute("/u/:username");
  const [isMap] = useRoute("/map");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 ${isMap ? "" : "pb-20 md:pb-0 md:pt-16"}`}>
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      {hasSession && !isMap && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden z-50">
          <div className="flex justify-around items-center h-16 px-2">
            <Link
              href="/home"
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isHome ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Home className={`w-6 h-6 ${isHome ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>

            <Link
              href="/experiences"
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isExperiences ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Compass className={`w-6 h-6 ${isExperiences ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Experiences</span>
            </Link>

            <Link
              href="/challenges"
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isChallenges ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Swords className={`w-6 h-6 ${isChallenges ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Challenges</span>
            </Link>

            <Link
              href="/u/me"
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors ${
                isProfile ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <UserCircle className={`w-6 h-6 ${isProfile ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Top Navigation (Desktop) */}
      {hasSession && !isMap && (
        <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 items-center px-8 z-50">
          <div className="text-xl font-display font-bold text-primary flex-1">experiences.fun</div>
          <Link
            href="/token"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary transition-colors bg-gray-50 hover:bg-primary/5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-primary/20"
          >
            <Info className="w-4 h-4" />
            <span>Token</span>
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </Link>
        </nav>
      )}
    </div>
  );
}
