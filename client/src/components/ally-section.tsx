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
    <section id="ally" className="bg-gradient-to-b from-[#f4f1f8] to-dz-surface py-16 md:py-20">
      <div className="mx-auto w-full max-w-dz px-[clamp(1rem,4vw,1.5rem)]">
        <div className="mb-10 text-center md:mb-12">
          <h2 className="font-display text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight text-primary">
            and We Meet{" "}
            <span className="font-accent italic font-normal text-dz-secondary">Yogis</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-dz-muted">
            Meet our diverse community of certified instructors who bring authentic expertise and
            inclusive teaching to every session.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {instructors.map((instructor, index) => (
            <div key={index} className="text-center">
              <div className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-full border-4 border-dz-surface ring-2 ring-primary/15">
                <img
                  src={instructor.image}
                  alt={instructor.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="font-display text-xl font-bold text-primary">{instructor.name}</h3>
              <p className="mt-1 text-sm font-semibold text-dz-secondary">{instructor.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-dz-muted">{instructor.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}