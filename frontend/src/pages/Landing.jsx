import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
    <div className="min-h-screen gradient-bg">
      {/* Hero Section with Carousel */}
      <section className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="space-y-8 animate-float">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="text-white">Ideate.</span>
                <br />
                <span className="text-gradient italic">Prompt.</span>
                <br />
                <span className="text-white">Build.</span>
              </h1>
              <p className="text-xl text-white/70 leading-relaxed">
                Whether you are a designer, a developer, or just curious, take an idea,
                <span className="text-gradient italic font-semibold"> prompt it</span>, and watch it come alive
              </p>
              <Link 
                to="/creator" 
                className="inline-block btn-primary text-lg px-12 py-4 animate-glow"
              >
                START BUILDING
              </Link>
            </div>

            {/* Carousel */}
            <div className="relative">
              <div className="glass-card p-8 min-h-[400px] flex flex-col justify-center items-center text-center space-y-6">
                <div className="text-8xl mb-4 animate-float">
                  {carouselItems[currentSlide].image}
                </div>
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
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        index === currentSlide 
                          ? 'bg-purple-bright w-8' 
                          : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section with Video */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Video Placeholder */}
            <div className="glass-card p-2 order-2 md:order-1">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-purple-dark to-purple-mid flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <p className="text-white/70">Watch Demo Video</p>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-6 order-1 md:order-2">
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
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-gradient">10K+</div>
                  <div className="text-white/60 mt-2">Designs Created</div>
                </div>
                <div className="glass-card p-6 text-center">
                  <div className="text-3xl font-bold text-gradient">5K+</div>
                  <div className="text-white/60 mt-2">Happy Creators</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            What Our <span className="text-gradient">Creators</span> Say
          </h2>
          <p className="text-lg text-white/70 mb-12">
            Join thousands of satisfied creators who have transformed their ideas into reality
          </p>

          {/* Testimonial Card */}
          <div className="glass-card p-12 relative">
            <div className="absolute top-8 left-8 text-6xl text-purple-bright/20">"</div>
            <div className="relative z-10 space-y-6">
              <p className="text-xl text-white/90 leading-relaxed italic">
                {testimonials[currentTestimonial].content}
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-mid to-purple-bright flex items-center justify-center text-white font-bold">
                  {testimonials[currentTestimonial].avatar}
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-white/60 text-sm">
                    {testimonials[currentTestimonial].role}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 text-6xl text-purple-bright/20 rotate-180">"</div>
          </div>

          {/* Testimonial Indicators */}
          <div className="flex gap-2 justify-center mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentTestimonial 
                    ? 'bg-purple-bright w-8' 
                    : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-card p-12 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to <span className="text-gradient">Create</span>?
            </h2>
            <p className="text-xl text-white/70">
              Join our community of creators and start building your brand today
            </p>
            <Link 
              to="/creator" 
              className="inline-block btn-primary text-lg px-12 py-4 animate-glow"
            >
              JOIN NOW
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
