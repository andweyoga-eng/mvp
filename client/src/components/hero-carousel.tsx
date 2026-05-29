import { useState, useEffect } from "react";
import embraceImage from "@assets/embrace-bw_1756460037530.jpg";
import experienceImage from "@assets/experience_1756460037530.jpg";
import expressImage from "@assets/express_1756460037530.jpg";
import evolveImage from "@assets/evolve_1756461197648.jpg";
import elevateImage from "@assets/elevate_1756460037530.jpg";
import becomeImage from "@assets/become_1756460037530.jpg";

const slides = [
  {
    image: embraceImage,
    title: "To Embrace",
    subtitle: "To embrace the journey of self-discovery and growth"
  },
  {
    image: experienceImage,
    title: "To Experience",
    subtitle: "To experience our body. Inside out. Outside in."
  },
  {
    image: expressImage,
    title: "To Express",
    subtitle: "To feel safe, smile and express."
  },
  {
    image: evolveImage,
    title: "To Evolve",
    subtitle: "To learn and grow"
  },
  {
    image: elevateImage,
    title: "To Elevate",
    subtitle: "To push beyond our limits and discover the strength within us."
  },
  {
    image: becomeImage,
    title: "To Become",
    subtitle: "To become more of who we are meant to be."
  }
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };


  return (
    <section id="home" className="relative h-screen overflow-hidden md:mt-16">
      <div className="carousel-container relative h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`carousel-slide absolute inset-0 ${index === currentSlide ? 'active' : ''}`}
          >
            <div className="absolute inset-0">
              <img 
                src={slide.image} 
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
                data-testid={`carousel-image-${index}`}
              />
              {/* Apply purple-to-orange gradient overlay to all slides */}
              <div className="absolute inset-0" style={{
                background: 'var(--gradient-hero)'
              }}></div>
            </div>
            <div className="relative z-10 h-full flex items-end justify-center text-center pb-32 md:pb-20">
              <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                  {slide.title}
                </h1>
                <div className="relative inline-block">
                  {/* Rectangular bar with purple-orange gradient background for all slides */}
                  <div 
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'var(--gradient-hero)'
                    }}
                  ></div>
                  <p className="text-xl md:text-2xl text-white font-bold px-6 py-3 relative z-10">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Navigation */}
      <div className="absolute bottom-16 md:bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
            }`}
            data-testid={`carousel-dot-${index}`}
          />
        ))}
      </div>
    </section>
  );
}