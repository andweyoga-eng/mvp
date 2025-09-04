import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    id: 1,
    name: "Sarah Mitchell",
    role: "Yoga Enthusiast",
    image: "https://images.unsplash.com/photo-1494790108755-2616c78ec4e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    quote: "andWeYoga has transformed my life. The instructors are incredibly knowledgeable and create such a welcoming environment.",
    rating: 5
  },
  {
    id: 2,
    name: "James Thompson",
    role: "Regular Practitioner",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    quote: "The variety of classes and flexible scheduling makes it easy to maintain a consistent practice. Highly recommend!",
    rating: 5
  },
  {
    id: 3,
    name: "Maria Garcia",
    role: "New Student",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    quote: "As a beginner, I was nervous, but the supportive community and patient instruction made all the difference.",
    rating: 5
  }
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">What Our Students Say</h2>
          <p className="text-xl text-purple-500 max-w-2xl mx-auto">
            Real stories from our yoga community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-card p-6 rounded-lg shadow-lg">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-secondary">
                    {Array.from({ length: testimonial.rating }).map((_, index) => (
                      <Star key={index} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-purple-600 mb-4 italic" data-testid={`testimonial-quote-${testimonial.id}`}>
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center">
                  <img 
                    src={testimonial.image} 
                    alt={`${testimonial.name} testimonial`}
                    className="w-12 h-12 rounded-full mr-4"
                    data-testid={`testimonial-image-${testimonial.id}`}
                  />
                  <div>
                    <h4 className="font-semibold" data-testid={`testimonial-name-${testimonial.id}`}>
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-purple-500" data-testid={`testimonial-role-${testimonial.id}`}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
