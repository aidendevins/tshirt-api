import { motion } from 'framer-motion';

export default function ProductTabs({ activeTab, onTabChange, counts }) {
    const tabs = [
        { id: 'featured', label: 'Featured', count: counts.featured },
        { id: 'all', label: 'All Products', count: counts.all },
        { id: 'community', label: 'Community Designs', count: counts.community },
    ];

    return (
        <div className="border-b border-white/10 mb-8">
            <div className="flex gap-8 overflow-x-auto pb-1 scrollbar-hide">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className="relative pb-4 px-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap"
                    >
                        <span className={`${activeTab === tab.id ? 'text-white' : 'text-white/60 hover:text-white/80'}`}>
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-2 text-xs py-0.5 px-2 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </span>
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-bright"
                                initial={false}
                            />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
