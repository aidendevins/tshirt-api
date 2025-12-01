import { motion } from 'framer-motion';

export default function ProfileHeader({ creator }) {
    // Default values if not provided
    const bannerImage = creator.bannerImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80';
    const profileImage = creator.profileImage || `https://ui-avatars.com/api/?name=${creator.firstName}+${creator.lastName}&background=random`;
    const joinDate = creator.createdAt ? new Date(creator.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown';

    // Custom theme colors if provided, otherwise defaults
    const primaryColor = creator.brandColors?.primary || '#8B5CF6'; // Default purple
    const secondaryColor = creator.brandColors?.secondary || '#000000';

    return (
        <div className="relative mb-8">
            {/* Banner */}
            <div className="h-64 md:h-80 w-full overflow-hidden rounded-b-3xl relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                <img
                    src={bannerImage}
                    alt="Profile Banner"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Profile Info */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="flex flex-col md:flex-row items-end md:items-center gap-6">
                    {/* Avatar */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative"
                    >
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-black shadow-xl">
                            <img
                                src={profileImage}
                                alt={`${creator.firstName} ${creator.lastName}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-black rounded-full" title="Online" />
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 pb-2">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-2">
                                {creator.businessName || `${creator.firstName} ${creator.lastName}`}
                                {creator.verified && (
                                    <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                    </svg>
                                )}
                            </h1>
                            <p className="text-white/60 text-lg">@{creator.username}</p>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mt-4 flex flex-wrap gap-4 text-sm text-white/70"
                        >
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Creator since {joinDate}
                            </span>
                            {creator.location && (
                                <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {creator.location}
                                </span>
                            )}
                        </motion.div>
                    </div>

                    {/* Socials & Actions */}
                    <div className="flex gap-3 pb-4">
                        {creator.socials && Object.entries(creator.socials).map(([platform, url]) => (
                            url && (
                                <a
                                    key={platform}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors text-white"
                                    title={platform}
                                >
                                    {/* Simple icons based on platform name */}
                                    {platform === 'instagram' && <span className="text-xl">📸</span>}
                                    {platform === 'twitter' && <span className="text-xl">🐦</span>}
                                    {platform === 'youtube' && <span className="text-xl">▶️</span>}
                                    {platform === 'tiktok' && <span className="text-xl">🎵</span>}
                                    {platform === 'website' && <span className="text-xl">🌐</span>}
                                    {!['instagram', 'twitter', 'youtube', 'tiktok', 'website'].includes(platform) && <span className="text-xl">🔗</span>}
                                </a>
                            )
                        ))}
                        <button className="btn-primary px-6">
                            Subscribe
                        </button>
                    </div>
                </div>

                {/* Bio */}
                {creator.bio && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 max-w-3xl"
                    >
                        <p className="text-white/80 leading-relaxed">{creator.bio}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
