import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import TextHoverEffect from '../components/ui/TextHoverEffect';
import BackgroundBeams from '../components/ui/BackgroundBeams';
import AnimatedTestimonials from '../components/ui/AnimatedTestimonials';
import MovingBorder from '../components/ui/MovingBorder';
import SpotlightBackground from '../components/ui/SpotlightBackground';
import { motion } from 'framer-motion';

export default function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const carouselItems = [
    {
      title: "Design Your Vision",
      description: "Create custom t-shirts with our intuitive design tools",
      image: "🎨"
    },
    {
      title: "AI-Powered Creation",
      description: "Let AI help bring your ideas to life instantly",
      image: "🤖"
    },
    {
      title: "Instant Preview",
      description: "See your designs come alive in real-time",
      image: "👕"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Fashion Designer",
      content: "This platform revolutionized how I create custom merchandise for my clients. The liquid glass interface is stunning!",
      avatar: "SJ"
    },
    {
      name: "Mike Chen",
      role: "Content Creator",
      content: "I've been able to launch my merch line in days instead of months. The design tools are incredibly intuitive.",
      avatar: "MC"
    },
    {
      name: "Emily Rodriguez",
      role: "Small Business Owner",
      content: "The AI-powered features saved me countless hours. My customers love the unique designs we can create together.",
      avatar: "ER"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen gradient-bg relative">
      <SpotlightBackground />

      {/* Hero Section with Carousel */}
      <section className="relative pt-32 pb-20 px-4 min-h-screen flex items-center overflow-hidden">
        <BackgroundBeams />
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <TextHoverEffect text="Ideate." className="text-white" />
                <br />
                <TextHoverEffect text="Prompt." className="text-gradient italic" />
                <br />
                <TextHoverEffect text="Build." className="text-white" />
              </h1>
              <motion.p
                className="text-xl text-white/70 leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                Whether you are a designer, a developer, or just curious, take an idea,
                <span className="text-gradient italic font-semibold"> prompt it</span>, and watch it come alive
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <Link to="/creator">
                  <MovingBorder className="text-lg">
                    START BUILDING
                  </MovingBorder>
                </Link>
              </motion.div>
            </motion.div>

            {/* Carousel */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="glass-card p-8 min-h-[400px] flex flex-col justify-center items-center text-center space-y-6">
                <motion.div
                  className="text-8xl mb-4"
                  animate={{
                    y: [0, -20, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {carouselItems[currentSlide].image}
                </motion.div>
                <h3 className="text-3xl font-bold text-white">
                  {carouselItems[currentSlide].title}
                </h3>
                <p className="text-lg text-white/70">
                  {carouselItems[currentSlide].description}
                </p>

                {/* Carousel Indicators */}
                <div className="flex gap-2 mt-6">
                  {carouselItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentSlide
                        ? 'bg-purple-bright w-8'
                        : 'bg-white/20 hover:bg-white/40'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section with Video */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Video Placeholder */}
            <motion.div
              className="order-2 md:order-1"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="glass-card p-2">
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-purple-dark to-purple-mid flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <motion.div
                      className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </motion.div>
                    <p className="text-white/70">Watch Demo Video</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text Content */}
            <motion.div
              className="space-y-6 order-1 md:order-2"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                What We <span className="text-gradient">Are</span>
              </h2>
              <p className="text-lg text-white/70 leading-relaxed">
                We're a revolutionary platform that empowers creators to design, customize, and sell unique t-shirts without any technical barriers. Our AI-powered tools make professional design accessible to everyone.
              </p>
              <p className="text-lg text-white/70 leading-relaxed">
                From concept to creation, we handle the complexity so you can focus on what matters most—bringing your creative vision to life and building your brand.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="glass-card p-6 text-center h-full flex flex-col justify-center">
                    <div className="text-3xl font-bold text-gradient">10K+</div>
                    <div className="text-white/60 mt-2">Designs Created</div>
                  </div>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="glass-card p-6 text-center h-full flex flex-col justify-center">
                    <div className="text-3xl font-bold text-gradient">5K+</div>
                    <div className="text-white/60 mt-2">Happy Creators</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What Our <span className="text-gradient">Creators</span> Say
            </h2>
            <p className="text-lg text-white/70 mb-12">
              Join thousands of satisfied creators who have transformed their ideas into reality
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <AnimatedTestimonials
              testimonials={testimonials}
              currentIndex={currentTestimonial}
              onIndexChange={setCurrentTestimonial}
            />
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="glass-card p-12 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Ready to <span className="text-gradient">Create</span>?
              </h2>
              <p className="text-xl text-white/70">
                Join our community of creators and start building your brand today
              </p>
              <Link to="/creator">
                <MovingBorder className="text-lg">
                  JOIN NOW
                </MovingBorder>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}