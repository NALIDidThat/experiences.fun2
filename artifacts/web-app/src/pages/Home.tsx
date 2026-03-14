import React from "react";
import { Layout } from "@/components/Layout";
import { Search, Compass, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 px-4 pt-8 pb-24 max-w-lg mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Discover</h1>
          <p className="text-gray-500">Find experiences happening near you</p>
        </header>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Search experiences, tags, people..." 
            className="w-full h-14 pl-12 rounded-2xl bg-white border-transparent shadow-sm focus-visible:ring-primary text-lg"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center py-16">
          <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-6">
            <Compass className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Feed coming soon</h2>
          <p className="text-gray-500 max-w-xs mx-auto">
            We're currently building out the discovery feed. In the meantime, you can manage your profile!
          </p>
        </div>
      </div>
    </Layout>
  );
}
