import { Button } from "@/components/ui/button";
import logoPath from "@assets/Logo Transperent TM_1756454893432.png";

export default function AboutSection() {
  const scrollToAlly = () => {
    const element = document.getElementById('ally');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToStory = () => {
    const element = document.getElementById('story');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="about" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <span className="text-4xl md:text-5xl font-bold text-primary mr-4">About</span>
                <img 
                  src={logoPath} 
                  alt="andWeYoga" 
                  className="h-16 md:h-20 w-auto"
                />
              </div>
              <p className="text-lg text-purple-600 mb-6">
                Founded in 2018, andWeYoga has been a sanctuary for wellness seekers and yoga practitioners of all levels. Our mission is to create a welcoming space where everyone can discover the transformative power of yoga.
              </p>
              <p className="text-lg text-purple-600 mb-6">
                With certified instructors and a variety of class styles, we're committed to helping you find balance, strength, and inner peace through the ancient practice of yoga.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={scrollToAlly}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="meet-instructors-button"
                >
                  and We Meet Yogis
                </Button>
                <Button 
                  variant="outline"
                  onClick={scrollToStory}
                  className="border-2 border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                  data-testid="our-story-button"
                >
                  and Our Story
                </Button>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
