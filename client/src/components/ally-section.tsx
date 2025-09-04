import arjunPatelImg from "@assets/arjunpatel_1756814809753.jpg";
import priyaSharmaImg from "@assets/priya sharma_1756814809753.jpg";
import aliceKumariImg from "@assets/allice kumari_1756814809753.jpg";

interface Instructor {
  name: string;
  title: string;
  description: string;
  image: string;
}

const instructors: Instructor[] = [
  {
    name: "Arjun Patel",
    title: "Certified Hatha Yoga Instructor",
    description: "500-hour RYT • YCB Level 2 Certified • Specializes in Hatha & Vinyasa Flow • Movement Advocate • 8+ years teaching experience",
    image: arjunPatelImg
  },
  {
    name: "Priya Sharma",
    title: "Certified Vinyasa Flow Teacher",
    description: "200-hour RYT • YCB Level 2 Certified • Power Yoga Specialist • Trauma-Informed Yoga • Breathwork Facilitator • 5+ years experience",
    image: priyaSharmaImg
  },
  {
    name: "Alice Kumari",
    title: "Certified Wellness Coach",
    description: "300-hour RYT • YCB Level 2 Certified • Yin Yoga & Restorative • LGBTQ+ Affirming Practice • Meditation Guide • 6+ years experience",
    image: aliceKumariImg
  }
];

export default function AllySection() {
  return (
    <section id="ally" className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">and We Meet Yogis</h2>
          <p className="text-lg text-purple-500 max-w-3xl mx-auto">
            Meet our diverse community of certified instructors who bring authentic expertise and inclusive teaching to every session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {instructors.map((instructor, index) => (
            <div key={index} className="text-center group">
              <div className="relative mb-6">
                <div className="w-40 h-40 mx-auto rounded-full border-4 border-purple-300 overflow-hidden group-hover:border-purple-500 transition-colors duration-300">
                  <img
                    src={instructor.image}
                    alt={instructor.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">{instructor.name}</h3>
              <h4 className="text-base font-semibold text-orange-500 mb-3">{instructor.title}</h4>
              <p className="text-sm text-purple-600 leading-relaxed">
                {instructor.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}