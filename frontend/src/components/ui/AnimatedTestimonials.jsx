import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";

export default function AnimatedTestimonials({ testimonials, currentIndex, onIndexChange }) {
  const current = testimonials[currentIndex];

  return (
    <div className="glass-card p-12 relative overflow-hidden">
      <div className="absolute top-8 left-8 text-6xl text-purple-bright/20">"</div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 space-y-6"
        >
          <p className="text-xl text-white/90 leading-relaxed italic">
            {current.content}
          </p>
          <div className="flex items-center justify-center gap-4">
            <motion.div 
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-mid to-purple-bright flex items-center justify-center text-white font-bold"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {current.avatar}
            </motion.div>
            <div className="text-left">
              <div className="text-white font-semibold">
                {current.name}
              </div>
              <div className="text-white/60 text-sm">
                {current.role}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute bottom-8 right-8 text-6xl text-purple-bright/20 rotate-180">"</div>
      
      {/* Indicators */}
      <div className="flex gap-2 justify-center mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => onIndexChange(index)}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              index === currentIndex 
                ? "bg-purple-bright w-8" 
                : "bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}
