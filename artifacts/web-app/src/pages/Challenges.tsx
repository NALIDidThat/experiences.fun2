import { Layout } from "@/components/Layout";
import { Swords, Trophy, Zap, Target, Clock } from "lucide-react";

export default function Challenges() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-gray-900">Challenges</h1>
            <p className="text-gray-500 text-sm mt-1">Compete, earn XP, and climb the leaderboard</p>
          </div>

          <div className="bg-gradient-to-br from-primary/5 via-rose-50 to-white rounded-3xl p-8 border border-primary/10 text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Swords className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
              Challenges — Coming Soon
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              Get ready to take on exciting challenges, compete with other explorers, and earn bonus XP. We're building something great.
            </p>
          </div>

          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">What to expect</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Weekly Challenges</h4>
              <p className="text-sm text-gray-500">New challenges every week to keep you engaged and earning rewards.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Bonus XP</h4>
              <p className="text-sm text-gray-500">Complete challenges to earn bonus XP and unlock exclusive rewards.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Community Goals</h4>
              <p className="text-sm text-gray-500">Team up with others to achieve shared goals and make a bigger impact.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1">Time-Limited Events</h4>
              <p className="text-sm text-gray-500">Special limited-time events with unique prizes and recognition.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
