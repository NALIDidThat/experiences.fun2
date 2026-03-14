import React, { useMemo } from "react";
import { motion } from "framer-motion";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_EMOJIS: Record<Step, string[]> = {
  1: ["🌍", "🌱", "🤝", "🎨", "🚀"],
  2: ["📍", "🗺️", "🏙️"],
  3: ["🌿", "📚", "🎨", "💻"],
  4: ["🙋‍♂️", "🎯", "🌟"],
  5: ["👤", "✨", "📝"],
  6: ["🎉", "🚀", "⭐"],
};

export function FloatingEmojis({ step }: { step: number }) {
  const safeStep = Math.min(Math.max(1, step), 6) as Step;
  const currentEmojis = STEP_EMOJIS[safeStep];

  const emojiPositions = useMemo(() => {
    return currentEmojis.map((_, i) => ({
      top: 15 + ((i * 23 + safeStep * 7) % 60),
      left: 10 + (i * 80) / Math.max(1, currentEmojis.length - 1),
      rotation: -20 + ((i * 17 + safeStep * 9) % 40),
      scale: 0.8 + ((i * 3 + safeStep) % 5) / 10,
    }));
  }, [safeStep, currentEmojis]);

  return (
    <div className="absolute top-0 left-0 w-full h-[55vh] md:h-full pointer-events-none overflow-hidden flex items-center justify-center">
      <div className="relative w-full max-w-4xl h-full">
        {currentEmojis.map((emoji, i) => (
          <motion.div
            key={`${safeStep}-${i}`}
            initial={{ opacity: 0, scale: 0, y: 50 }}
            animate={{ 
              opacity: 0.8, 
              scale: emojiPositions[i].scale, 
              y: 0,
              rotate: emojiPositions[i].rotation
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ 
              duration: 0.7, 
              delay: i * 0.1,
              type: "spring",
              bounce: 0.4
            }}
            className="absolute text-6xl md:text-8xl drop-shadow-xl filter"
            style={{
              top: `${emojiPositions[i].top}%`,
              left: `${emojiPositions[i].left}%`,
            }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
