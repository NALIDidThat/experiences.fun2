import React from "react";
import { Link, useRoute } from "wouter";
import { Home, UserCircle } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const hasSession = isAuthenticated();
  const [isHome] = useRoute("/home");
  const [isProfile] = useRoute("/u/:username");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      {hasSession && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden z-50">
          <div className="flex justify-around items-center h-16 px-4">
            <Link 
              href="/home" 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isHome ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Home className={`w-6 h-6 ${isHome ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            
            <Link 
              href="/u/me" 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isProfile ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <UserCircle className={`w-6 h-6 ${isProfile ? "fill-primary/10" : ""}`} />
              <span className="text-[10px] font-medium">Profile</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Top Navigation (Desktop) - Simple version */}
      {hasSession && (
        <nav className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 items-center px-8 z-50">
          <div className="text-xl font-display font-bold text-primary mr-8">experiences.fun</div>
          <div className="flex gap-6">
            <Link href="/home" className={`font-medium transition-colors ${isHome ? "text-primary" : "text-gray-500 hover:text-gray-900"}`}>
              Home
            </Link>
            <Link href="/u/me" className={`font-medium transition-colors ${isProfile ? "text-primary" : "text-gray-500 hover:text-gray-900"}`}>
              Profile
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
