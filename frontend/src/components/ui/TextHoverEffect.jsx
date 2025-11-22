import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

export default function TextHoverEffect({ text, className }) {
  return (
    <motion.span
      className={cn("inline-block", className)}
      whileHover={{
        scale: 1.05,
        textShadow: "0 0 20px rgba(139, 92, 246, 0.8)",
      }}
      transition={{ duration: 0.3 }}
    >
      {text}
    </motion.span>
  );
}
