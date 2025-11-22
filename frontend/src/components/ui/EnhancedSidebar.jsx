import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../utils/cn";

export default function EnhancedSidebar({ items, className }) {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={cn("glass-card p-6 space-y-2", className)}
    >
      {items.map((item, idx) => {
        const isActive = location.pathname === item.path;
        
        return (
          <Link key={idx} to={item.path}>
            <motion.div
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden group",
                isActive 
                  ? "bg-gradient-to-r from-purple-mid to-purple-bright text-white shadow-glow" 
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-gradient-to-r from-purple-mid to-purple-bright rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3 w-full">
                {item.icon && <span className="text-xl">{item.icon}</span>}
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-purple-bright/20 text-purple-light text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>
            </motion.div>
          </Link>
        );
      })}
    </motion.aside>
  );
}
