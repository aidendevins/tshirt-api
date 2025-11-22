import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export default function MovingBorder({ children, className, containerClassName, borderClassName, duration = 2000, ...props }) {
  return (
    <button
      className={cn(
        "relative p-[1px] overflow-hidden rounded-full",
        containerClassName
      )}
      {...props}
    >
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full",
          borderClassName
        )}
        style={{
          background: "linear-gradient(90deg, #8b5cf6, #a78bfa, #8b5cf6)",
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "200% 0%"],
        }}
        transition={{
          duration: duration / 1000,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className={cn(
        "relative bg-purple-deep rounded-full px-8 py-3 font-semibold text-white",
        className
      )}>
        {children}
      </div>
    </button>
  );
}
