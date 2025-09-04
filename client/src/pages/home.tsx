import { useState } from 'react';

export default function Home() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleBookingClick = () => {
    setIsBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-orange-500">
        <div className="text-center text-white">
          <h1 className="text-6xl md:text-8xl font-bold mb-6">andWeYoga</h1>
          <p className="text-xl md:text-2xl mb-8">Find your inner peace through yoga practice</p>
          <button 
            onClick={handleBookingClick}
            className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            Book Your Session
          </button>
        </div>
      </section>

      {/* Classes Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-purple-600 mb-12">Our Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Hatha Yoga', price: '₹500' },
              { name: 'Hyyocross', price: '₹600' },
              { name: 'Meditation', price: '₹400' },
              { name: 'Sound Therapy', price: '₹800' }
            ].map((classType) => (
              <div key={classType.name} className="bg-gray-50 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold text-purple-600 mb-4">{classType.name}</h3>
                <p className="text-2xl font-bold text-orange-500 mb-4">{classType.price}</p>
                <button 
                  onClick={handleBookingClick}
                  className="bg-purple-600 text-white px-6 py-2 rounded-full font-bold hover:bg-purple-700 transition-colors"
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-purple-600 mb-8">About andWeYoga</h2>
          <p className="text-lg text-purple-500 max-w-3xl mx-auto">
            Welcome to andWeYoga, where transformation begins. We believe in the power of yoga to heal, 
            strengthen, and unite mind, body, and spirit. Our experienced instructors guide you through 
            various practices designed to meet you where you are in your wellness journey.
          </p>
        </div>
      </section>

      {/* Simple Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-purple-600">Book Your Session</h3>
              <button 
                onClick={() => setIsBookingModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Your Email"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="tel"
                placeholder="Your Phone"
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <select className="w-full p-3 border border-gray-300 rounded-lg">
                <option>Select Class Type</option>
                <option>Hatha Yoga</option>
                <option>Hyyocross</option>
                <option>Meditation</option>
                <option>Sound Therapy</option>
              </select>
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
              >
                Book Session
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}