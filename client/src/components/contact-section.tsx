import { Mail, Phone, Clock, Instagram } from "lucide-react";

export default function ContactSection() {
  return (
    <section id="connect" className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">and We Connect</h2>
          <p className="text-lg text-purple-500 max-w-3xl mx-auto">
            Ready to begin your journey? Connect with us for group sessions, personal training, or corporate bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Email Us */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Email Us</h3>
            <p className="text-purple-600 text-sm">
              mudit@andweyoga.com
            </p>
          </div>

          {/* Call Us */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Call Us</h3>
            <p className="text-purple-600 text-sm">
              +91 9513022331
            </p>
          </div>

          {/* Business Hours */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Business Hours</h3>
            <p className="text-purple-600 text-sm">
              9 AM - 5 PM IST
            </p>
          </div>

          {/* Follow Us */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center">
              <Instagram className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Follow Us</h3>
            <a 
              href="https://www.instagram.com/andweyoga/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 text-sm hover:text-purple-800 transition-colors"
            >
              @muditbeing
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}