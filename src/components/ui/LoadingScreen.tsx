import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
      />
      <h2 className="text-xl font-semibold text-slate-800">HR Pro</h2>
      <p className="text-slate-500 text-sm">Loading your workspace...</p>
    </div>
  );
}
