interface CareProgram {
  title: string;
  description: string;
  schedule: string;
  icon: string;
}

const carePrograms: CareProgram[] = [
  {
    title: "Blind School Partnership",
    description: "We conduct weekly adaptive yoga sessions at the Mumbai Association for the Blind, creating accessible wellness programs that focus on spatial awareness, balance, and mindful movement. Our instructors are trained in tactile guidance techniques to ensure every participant feels supported and empowered.",
    schedule: "Every Tuesday • 3:00 PM • Completely Free of Charge",
    icon: "🤝"
  },
  {
    title: "Paraplegic Institute Sessions",
    description: "At the Indian Spinal Injuries Centre, we offer specialized chair yoga and upper body strength programs. These sessions focus on improving flexibility, respiratory function, and mental wellness for individuals with spinal cord injuries, fostering independence and confidence through adapted yoga practices.",
    schedule: "Every Friday • 4:00 PM • Community Service Initiative",
    icon: "👥"
  }
];

export default function CareSection() {
  return (
    <section id="care" className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">and We Care</h2>
          <p className="text-lg text-purple-500 max-w-3xl mx-auto">
            Our commitment extends beyond the studio through meaningful community partnerships and inclusive wellness initiatives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {carePrograms.map((program, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full text-white text-2xl mb-6 mx-auto">
                {program.icon}
              </div>
              <h3 className="text-xl font-bold text-primary mb-4 text-center">{program.title}</h3>
              <p className="text-purple-600 leading-relaxed mb-4 text-center">
                {program.description}
              </p>
              <p className="text-orange-500 font-semibold text-center">
                {program.schedule}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}