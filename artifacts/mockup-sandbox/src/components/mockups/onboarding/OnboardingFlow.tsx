import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

// Types
type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  city: string;
  country: string;
  interests: string[];
  participation: string;
  name: string;
  username: string;
  bio: string;
}

const INTERESTS = [
  { id: "environment", label: "Environmental action", icon: "🌿" },
  { id: "education", label: "Education & mentoring", icon: "📚" },
  { id: "community", label: "Community volunteering", icon: "🤝" },
  { id: "creative", label: "Creative workshops", icon: "🎨" },
  { id: "entrepreneurship", label: "Entrepreneurship", icon: "🚀" },
  { id: "health", label: "Health & wellbeing", icon: "💪" },
  { id: "tech", label: "Technology", icon: "💻" },
  { id: "events", label: "Local events", icon: "🎉" },
];

const PARTICIPATION_OPTIONS = [
  { id: "join", title: "Join experiences", description: "Participate in activities" },
  { id: "host", title: "Host experiences", description: "Organize experiences for others" },
  { id: "both", title: "Both", description: "Join and host" },
];

const RECOMMENDATIONS = [
  { id: 1, title: "Community Tree Planting", location: "London", day: "Saturday", xp: 100 },
  { id: 2, title: "Beach Cleanup Initiative", location: "Brighton", day: "Sunday", xp: 75 },
  { id: 3, title: "Youth Mentoring Workshop", location: "London", day: "Wednesday", xp: 120 },
];

export default function OnboardingFlow() {
  const [step, setStep] = useState<Step>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    city: "",
    country: "",
    interests: [],
    participation: "",
    name: "",
    username: "",
    bio: "",
  });

  const nextStep = () => {
    if (step < 6) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep((step + 1) as Step);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep((step - 1) as Step);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleInterestToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Emojis for the top area based on step
  const getEmojis = () => {
    switch (step) {
      case 1: return ["🌍", "🌱", "🤝", "🎨", "🚀"];
      case 2: return ["📍", "🗺️", "🏙️"];
      case 3: return ["🌿", "📚", "🎨", "💻"];
      case 4: return ["🙋‍♂️", "🎯", "🌟"];
      case 5: return ["👤", "✨", "📝"];
      case 6: return ["🎉", "🚀", "⭐"];
      default: return [];
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#5B5FE6] to-[#818CF8] flex flex-col items-center justify-end sm:justify-center overflow-hidden font-sans relative">
      
      {/* Background Floating Elements */}
      <div className="absolute top-0 left-0 w-full h-[50vh] sm:h-full pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="relative w-full max-w-md h-full">
          {getEmojis().map((emoji, i) => (
            <div
              key={`${step}-${i}`}
              className="absolute text-5xl sm:text-7xl animate-in fade-in zoom-in duration-700 drop-shadow-lg"
              style={{
                top: `${20 + Math.random() * 40}%`,
                left: `${10 + (i * 80) / Math.max(1, getEmojis().length - 1)}%`,
                animationDelay: `${i * 100}ms`,
                transform: `translate(-50%, -50%) rotate(${-15 + Math.random() * 30}deg)`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <div 
        className={`w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl p-6 sm:p-8 pt-8 sm:pt-10 transition-all duration-300 ease-in-out relative z-10 flex flex-col min-h-[60vh] sm:min-h-[500px]
          ${isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}
        `}
      >
        {/* Back Button */}
        {step > 1 && (
          <button 
            onClick={prevStep}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Content Container */}
        <div className="flex-1 flex flex-col mt-4">
          
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                  Welcome to experiences.fun
                </h1>
                <p className="text-gray-500 text-lg leading-relaxed mb-8">
                  This platform helps people participate in real-world experiences that create measurable impact.
                </p>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={nextStep} 
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl group shadow-lg shadow-indigo-200"
                >
                  Start
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Where are you based?</h2>
                <p className="text-gray-500 mb-8">
                  We use your location to show nearby experiences and community initiatives.
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">City</label>
                    <Input 
                      placeholder="e.g. London" 
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-[#4F46E5] text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Country</label>
                    <Input 
                      placeholder="e.g. United Kingdom" 
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-[#4F46E5] text-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={nextStep}
                  disabled={!formData.city || !formData.country}
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-300"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {step === 3 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">What interests you most?</h2>
                <p className="text-gray-500 mb-6">
                  Choose anything that feels exciting.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {INTERESTS.map((interest) => {
                    const isSelected = formData.interests.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        onClick={() => handleInterestToggle(interest.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center ${
                          isSelected 
                            ? "border-[#4F46E5] bg-indigo-50 text-[#4F46E5]" 
                            : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-2xl mb-2">{interest.icon}</span>
                        <span className={`text-sm font-medium leading-tight ${isSelected ? "text-[#4F46E5]" : ""}`}>
                          {interest.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={nextStep}
                  disabled={formData.interests.length === 0}
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-300"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Contribution Type */}
          {step === 4 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">How would you like to participate?</h2>
                
                <div className="space-y-4">
                  {PARTICIPATION_OPTIONS.map((option) => {
                    const isSelected = formData.participation === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleInputChange("participation", option.id)}
                        className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between ${
                          isSelected 
                            ? "border-[#4F46E5] bg-indigo-50" 
                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <div className={`font-bold text-lg mb-1 ${isSelected ? "text-[#4F46E5]" : "text-gray-900"}`}>
                            {option.title}
                          </div>
                          <div className={`text-sm ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                            {option.description}
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-[#4F46E5] bg-[#4F46E5]" : "border-gray-300"
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={nextStep}
                  disabled={!formData.participation}
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-300"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Profile Creation */}
          {step === 5 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Create your profile</h2>
                <p className="text-gray-500 mb-8">
                  This helps the community recognise your contributions.
                </p>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Name</label>
                    <Input 
                      placeholder="Jane Doe" 
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-[#4F46E5]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                      <Input 
                        placeholder="janedoe" 
                        value={formData.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                        className="h-12 pl-8 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-[#4F46E5]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 ml-1">Short bio <span className="text-gray-400 font-normal">(optional)</span></label>
                    <Textarea 
                      placeholder="Passionate about the environment and building local communities..." 
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      className="min-h-[100px] resize-none bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-[#4F46E5]"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={nextStep}
                  disabled={!formData.name || !formData.username}
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-300"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Completion */}
          {step === 6 && (
            <div className="flex flex-col h-full justify-between flex-1">
              <div className="relative pt-6">
                <div className="absolute -top-14 left-0 bg-yellow-400 text-yellow-900 font-bold px-4 py-1.5 rounded-full text-sm inline-flex items-center shadow-lg transform -rotate-2">
                  <span className="mr-1">⭐</span> +50 XP for joining
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Nice to meet you!</h2>
                <p className="text-gray-500 mb-6">
                  Based on your interests, here are some experiences you can join this week.
                </p>
                
                <div className="space-y-3">
                  {RECOMMENDATIONS.map((rec) => (
                    <div key={rec.id} className="p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{rec.title}</h3>
                        <div className="flex text-sm text-gray-500 mt-1 gap-2 items-center">
                          <span className="flex items-center"><MapPinIcon className="w-3 h-3 mr-1" /> {rec.location}</span>
                          <span>•</span>
                          <span>{rec.day}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">+{rec.xp} XP</span>
                        <Button variant="outline" size="sm" className="h-8 rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                          Join
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto pt-8">
                <Button 
                  onClick={() => console.log("Flow completed!", formData)}
                  className="w-full h-14 text-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl shadow-lg shadow-indigo-200"
                >
                  Explore Experiences
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 mt-8 pb-2">
          {[1, 2, 3, 4, 5, 6].map((indicatorStep) => (
            <div
              key={indicatorStep}
              className={`h-2 rounded-full transition-all duration-300 ${
                indicatorStep === step
                  ? "w-8 bg-[#4F46E5]"
                  : indicatorStep < step
                  ? "w-2 bg-[#818CF8] opacity-60"
                  : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
