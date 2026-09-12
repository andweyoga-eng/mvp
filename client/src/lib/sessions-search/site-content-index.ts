export interface SiteContentEntry {
  id: string;
  title: string;
  body: string;
  keywords: string[];
  href: string;
  section: string;
}

/**
 * Curated searchable copy from public pages, carousels, cards, and sections.
 * Keep in sync when marketing copy changes (or move to CMS later).
 */
export const SITE_CONTENT_INDEX: SiteContentEntry[] = [
  // Home hero carousel trails
  {
    id: "carousel-embrace",
    title: "To Embrace · Journey of Self Discovery",
    body: "and We Yoga. To Embrace. Journey of Self Discovery.",
    keywords: ["embrace", "discovery", "self", "journey", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  {
    id: "carousel-experience",
    title: "To Experience · Our Body inside out, Outside in",
    body: "and We Yoga. To Experience. Our Body inside out, Outside in.",
    keywords: ["experience", "body", "inside out", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  {
    id: "carousel-express",
    title: "To Express · To Feel Safe",
    body: "and We Yoga. To Express. To Feel Safe.",
    keywords: ["express", "safe", "feel safe", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  {
    id: "carousel-evolve",
    title: "To Evolve · To Learn and Grow",
    body: "and We Yoga. To Evolve. To Learn and Grow.",
    keywords: ["evolve", "learn", "grow", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  {
    id: "carousel-elevate",
    title: "To Elevate · To push beyond our limits",
    body: "and We Yoga. To Elevate. To push beyond our limits.",
    keywords: ["elevate", "limits", "push", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  {
    id: "carousel-become",
    title: "To Become · Who we are meant to be",
    body: "and We Yoga. To Become. Who we are meant to be.",
    keywords: ["become", "meant to be", "home carousel"],
    href: "/#home",
    section: "Home carousel",
  },
  // Believe / Care
  {
    id: "believe-quote",
    title: "and We Believe",
    body:
      "We believe you don't have to win to win in life. Progress not perfection. Connection not competition. Learning not losing. Go with the flow. Inside out, outside in. And that is yoga.",
    keywords: ["believe", "philosophy", "progress", "connection", "yoga"],
    href: "/#believe",
    section: "Home",
  },
  {
    id: "care-blind-school",
    title: "Blind School Partnership",
    body:
      "Weekly adaptive yoga at Mumbai Association for the Blind. Accessible wellness focused on spatial awareness, balance, and mindful movement. Every Tuesday 3:00 PM free of charge.",
    keywords: ["care", "blind", "adaptive", "accessibility", "community"],
    href: "/#care",
    section: "Community",
  },
  {
    id: "care-paraplegic",
    title: "Paraplegic Institute Sessions",
    body:
      "Chair yoga and upper body strength at Indian Spinal Injuries Centre. Flexibility, respiratory function, and mental wellness. Every Friday 4:00 PM community service.",
    keywords: ["care", "paraplegic", "chair yoga", "strength", "flexibility", "seniors", "accessibility"],
    href: "/#care",
    section: "Community",
  },
  // Coaches (public home section)
  {
    id: "coaches-section",
    title: "and We Meet Coach",
    body:
      "Meet our diverse community of certified instructors who bring authentic expertise and inclusive teaching to every session.",
    keywords: ["coach", "coaches", "instructor", "instructors", "meet coach", "certified"],
    href: "/#ally",
    section: "Coaches",
  },
  {
    id: "coach-arjun",
    title: "Arjun Patel · Certified Hatha Yoga Instructor",
    body:
      "500-hour RYT. YCB Level 2. Specializes in Hatha and Vinyasa Flow. Movement Advocate. 8+ years teaching experience.",
    keywords: ["arjun", "hatha", "vinyasa", "coach", "instructor"],
    href: "/#ally",
    section: "Coach",
  },
  {
    id: "coach-priya",
    title: "Priya Sharma · Certified Vinyasa Flow Teacher",
    body:
      "200-hour RYT. YCB Level 2. Power Yoga Specialist. Trauma-Informed Yoga. Breathwork Facilitator. 5+ years experience.",
    keywords: ["priya", "vinyasa", "power yoga", "breathwork", "coach", "instructor"],
    href: "/#ally",
    section: "Coach",
  },
  {
    id: "coach-alice",
    title: "Alice Kumari · Certified Wellness Coach",
    body:
      "300-hour RYT. YCB Level 2. Yin Yoga and Restorative. LGBTQ+ Affirming Practice. Meditation Guide. 6+ years experience.",
    keywords: ["alice", "yin", "restorative", "meditation", "wellness coach", "coach"],
    href: "/#ally",
    section: "Coach",
  },
  // Explore page
  {
    id: "explore-hero",
    title: "Find your flow · Explore",
    body:
      "Discover curated wellness journeys designed for your unique path, from deep meditation to high-energy flow.",
    keywords: ["explore", "flow", "wellness", "discover"],
    href: "/explore",
    section: "Explore",
  },
  {
    id: "explore-daily-centering",
    title: "Daily Centering · Meditation",
    body: "A quick session to find focus amidst a busy digital day. 15 min.",
    keywords: ["meditation", "centering", "mindfulness", "15 min"],
    href: "/explore",
    section: "Explore trend",
  },
  {
    id: "explore-connection-asanas",
    title: "Connection Asanas · Workshop",
    body: "Explore the geometry of balance in this intermediate partner flow workshop.",
    keywords: ["asana", "partner", "workshop", "balance"],
    href: "/explore",
    section: "Explore trend",
  },
  {
    id: "article-morning-rituals",
    title: "Morning Rituals: Beyond the Mat",
    body:
      "How to integrate yoga philosophy into your daily routine for better mental clarity. Mindfulness journal article.",
    keywords: ["blog", "article", "morning", "ritual", "mindfulness", "journal"],
    href: "/explore",
    section: "Article",
  },
  {
    id: "article-fueling-flow",
    title: "Fueling Flow: Post-Practice Meals",
    body:
      "Why protein timing matters and three simple recipes that take under ten minutes to prep. Nutrition article.",
    keywords: ["blog", "article", "nutrition", "meals", "post practice"],
    href: "/explore",
    section: "Article",
  },
  {
    id: "pick-restorative-night",
    title: "Restorative Nighttime Yoga",
    body: "Personalized pick based on your sleep logs.",
    keywords: ["restorative", "night", "sleep", "personalized"],
    href: "/explore",
    section: "Explore pick",
  },
  {
    id: "pick-core-strength",
    title: "Core Integrity Bootcamp",
    body: "Matches your goal: Core Strength.",
    keywords: ["core", "strength", "bootcamp", "fitness"],
    href: "/explore",
    section: "Explore pick",
  },
  {
    id: "pick-pranayama-stress",
    title: "Pranayama for Stress",
    body: "Popular in your location. Breathwork for stress relief.",
    keywords: ["pranayama", "stress", "breath", "breathwork"],
    href: "/explore",
    section: "Explore pick",
  },
  // Workshops
  {
    id: "workshops-hero",
    title: "Elevate your practice · Workshops",
    body:
      "Deepen your knowledge with curated masterclasses led by world-class instructors. Transformative experiences for every level.",
    keywords: ["workshop", "workshops", "we learn", "WeBuild", "andWeBuild", "masterclass", "elevate"],
    href: "/workshops",
    section: "Workshops",
  },
  {
    id: "workshop-advanced-asana",
    title: "Advanced Asana Intensive",
    body:
      "Master complex transitions and inversions with personalized adjustments from senior teachers. Intermediate plus. Lotus Sky Studio hybrid.",
    keywords: ["asana", "inversions", "intermediate", "workshop", "strength"],
    href: "/workshops",
    section: "Workshop",
  },
  {
    id: "workshop-mindfulness-beginners",
    title: "Mindfulness for Beginners",
    body:
      "Introduction to formal meditation, mindful movement, and everyday presence techniques. Beginner friendly. Live stream and on-demand.",
    keywords: ["mindfulness", "beginner", "meditation", "workshop"],
    href: "/workshops",
    section: "Workshop",
  },
  {
    id: "workshop-breathwork",
    title: "Breathwork and Pranayama Masterclass",
    body:
      "Explore the science and spirit of the breath. Advanced pranayama techniques to regulate the nervous system. Sound and healing breath.",
    keywords: ["breathwork", "pranayama", "sound", "therapy", "nervous system", "workshop"],
    href: "/workshops",
    section: "Workshop",
  },
  // Trips
  {
    id: "trips-hero",
    title: "Beyond the mat: trips and treks",
    body:
      "Transformative retreats in sacred spaces. Explore internal stillness through external exploration. Soulful journeys.",
    keywords: ["trips", "treks", "retreat", "travel", "journey"],
    href: "/trips",
    section: "Trips",
  },
  {
    id: "trip-himalayan",
    title: "Himalayan Zen Retreat",
    body: "Most popular retreat. Himalayan zen immersion. Image alt: Himalayan Zen Retreat.",
    keywords: ["himalayan", "zen", "retreat", "mountain", "trip"],
    href: "/trips",
    section: "Trip",
  },
  {
    id: "trip-coastal",
    title: "Coastal Yoga and Surf Camp",
    body:
      "Find your flow on the waves and the mat. Adventure and mindfulness in Portugal. Image alt: Coastal Yoga and Surf Camp.",
    keywords: ["coastal", "surf", "yoga camp", "portugal", "trip"],
    href: "/trips",
    section: "Trip",
  },
  {
    id: "trip-forest",
    title: "Spiritual Forest Trek",
    body:
      "Deep immersion in ancient forests of Japan. Shinrin-yoku forest bathing and sunrise yoga.",
    keywords: ["forest", "trek", "japan", "shinrin-yoku", "nature", "trip"],
    href: "/trips",
    section: "Trip",
  },
  // Emojou
  {
    id: "emojou-hero",
    title: "Emojou · Your soul's creative playground",
    body: "Mindful reflections, vibe tracker, daily intention, mindful moments journal.",
    keywords: ["emojou", "journal", "creative", "reflection", "vibe"],
    href: "/emojou",
    section: "Emojou",
  },
  // Class type aliases (marketing tags until admin tags exist)
  {
    id: "tag-sound-therapy",
    title: "Sound Therapy",
    body:
      "Healing sounds, vibration, gong, and bowl sessions. Restorative sound therapy practice.",
    keywords: ["sound therapy", "sound", "healing", "gong", "bowl", "vibration"],
    href: "/dashboard#weekly-schedule",
    section: "Class topic",
  },
  {
    id: "tag-shasti-plus",
    title: "Shasti+ · Strength and flexibility for seniors",
    body:
      "Gentle strength and flexibility program designed for seniors and older adults. Mobility, balance, and safe progressive practice.",
    keywords: [
      "shasti",
      "shasti plus",
      "shasti+",
      "seniors",
      "senior",
      "older adults",
      "strength",
      "flexibility",
      "mobility",
      "balance",
    ],
    href: "/dashboard#weekly-schedule",
    section: "Class topic",
  },
  {
    id: "tag-hatha",
    title: "Hatha Yoga",
    body: "Foundational hatha practice. Alignment, breath, and steady postures.",
    keywords: ["hatha", "alignment", "foundational"],
    href: "/dashboard#weekly-schedule",
    section: "Class topic",
  },
  {
    id: "tag-meditation",
    title: "Meditation",
    body: "Guided meditation and stillness practices.",
    keywords: ["meditation", "stillness", "mindfulness"],
    href: "/dashboard#weekly-schedule",
    section: "Class topic",
  },
  {
    id: "tag-hyyocross",
    title: "Hyyocross",
    body: "Hybrid yoga and cross-training flow for strength and cardio.",
    keywords: ["hyyocross", "hybrid", "cross", "strength", "cardio"],
    href: "/dashboard#weekly-schedule",
    section: "Class topic",
  },
];
