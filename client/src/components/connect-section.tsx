export default function ConnectSection() {
  return (
    <section id="connect-old" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">and We Connect</h2>
              <p className="text-lg text-purple-600 mb-6">
                True wellness happens in connection - with yourself, with others, and with the world around you. We foster meaningful relationships that support your growth and enrich your life.
              </p>
              <p className="text-lg text-purple-600 mb-6">
                Through workshops, retreats, community events, and daily practice, we create opportunities for authentic connection and shared experiences that last a lifetime.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-card p-6 rounded-lg shadow-sm">
                  <h4 className="text-xl font-semibold text-primary mb-2">Weekly Circles</h4>
                  <p className="text-purple-600 text-sm">Join our community discussions and share your journey</p>
                </div>
                <div className="bg-card p-6 rounded-lg shadow-sm">
                  <h4 className="text-xl font-semibold text-primary mb-2">Yoga Retreats</h4>
                  <p className="text-purple-600 text-sm">Deep connections through immersive experiences</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-primary text-white px-8 py-4 rounded-full font-bold hover:bg-primary/90 hover-lift shadow-lg transition-all duration-200">
                  Join Events
                </button>
                <button className="border-2 border-primary text-primary px-8 py-4 rounded-full font-bold hover:bg-primary hover:text-white transition-all duration-300 hover-lift">
                  Community Hub
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400" 
                alt="People connecting through yoga practice" 
                className="rounded-lg shadow-lg w-full"
                data-testid="connect-image"
              />
              <div className="absolute -bottom-6 -right-6 bg-secondary text-secondary-foreground p-6 rounded-lg shadow-lg">
                <h4 className="text-2xl font-bold">365</h4>
                <p className="text-sm">Days Connected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}