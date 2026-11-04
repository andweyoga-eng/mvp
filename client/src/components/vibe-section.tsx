// Import user-provided Instagram profile images
import instaProfile1 from "@assets/insta-profile-1_1756815967899.jpg";
import instaProfile2 from "@assets/insta-profile-2_1756815967899.jpg";
import instaProfile3 from "@assets/insta-profile-3_1756815967899.jpg";
import instaProfile4 from "@assets/insta-profile-4_1756815967899.jpg";
import instaProfile5 from "@assets/insta-profile-5_1756815967899.jpg";
import instaProfile6 from "@assets/insta-profile-6_1756815967899.jpg";
import instaProfile7 from "@assets/insta-profile-7_1756815967899.jpg";
import instaProfile8 from "@assets/insta-profile-8_1756815967899.jpg";
import instaProfile9 from "@assets/insta-profile-9_1756815967899.jpg";
import instaProfile10 from "@assets/insta-profile-10_1756815967899.jpg";

// Import generated Instagram profile images
import generatedProfile1 from "@assets/generated_images/Indian_woman_yoga_profile_8dd25b53.png";
import generatedProfile2 from "@assets/generated_images/Indian_man_yoga_profile_9ca9119e.png";
import generatedProfile3 from "@assets/generated_images/Indian_woman_meditation_profile_db83d14d.png";
import generatedProfile4 from "@assets/generated_images/Indian_man_wellness_profile_2661ae79.png";
import generatedProfile5 from "@assets/generated_images/Indian_fitness_woman_profile_b156897e.png";
import generatedProfile6 from "@assets/generated_images/Indian_meditation_man_profile_aa4abcc9.png";
import generatedProfile7 from "@assets/generated_images/Indian_traditional_woman_profile_1504dbb7.png";
import generatedProfile8 from "@assets/generated_images/Indian_modern_man_profile_78ffb7c2.png";
import generatedProfile9 from "@assets/generated_images/Indian_wellness_woman_profile_54913341.png";
import generatedProfile10 from "@assets/generated_images/Indian_tech_yoga_profile_cf4e9e54.png";

interface InstagramProfile {
  image: string;
  handle: string;
}

// ** PLACEHOLDER FOR FUTURE UPDATES **
// Easy configuration for Instagram profiles - modify this array to update profiles
const instagramProfiles: InstagramProfile[] = [
  // Row 1
  { image: instaProfile1, handle: "@yogini_priya" },
  { image: instaProfile2, handle: "@arjun_flows" },
  { image: instaProfile3, handle: "@mindful_maya" },
  { image: instaProfile4, handle: "@zen_rohit" },
  { image: instaProfile5, handle: "@flex_kavya" },
  
  // Row 2
  { image: instaProfile6, handle: "@namaste_dev" },
  { image: instaProfile7, handle: "@warrior_anaya" },
  { image: instaProfile8, handle: "@breath_kiran" },
  { image: instaProfile9, handle: "@strong_meera" },
  { image: instaProfile10, handle: "@balance_raj" },
  
  // Row 3
  { image: generatedProfile1, handle: "@flow_nisha" },
  { image: generatedProfile2, handle: "@street_yogi" },
  { image: generatedProfile3, handle: "@saree_asanas" },
  { image: generatedProfile4, handle: "@chef_chakras" },
  { image: generatedProfile5, handle: "@cafe_karma" },
  
  // Row 4
  { image: generatedProfile6, handle: "@wellness_warrior" },
  { image: generatedProfile7, handle: "@mindful_mama" },
  { image: generatedProfile8, handle: "@tech_tranquil" },
  { image: generatedProfile9, handle: "@balance_babe" },
  { image: generatedProfile10, handle: "@urban_zen" }
];

export default function VibeSection() {
  return (
    <section id="vibe" className="bg-dz-surface py-16 md:py-20">
      <div className="mx-auto w-full max-w-dz px-[clamp(1rem,4vw,1.5rem)]">
        <div className="mb-10 text-center md:mb-12">
          <h2 className="font-display text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight text-primary">
            and We <span className="font-accent italic font-normal text-dz-secondary">Vibe</span>
          </h2>
          <p className="mx-auto mt-2.5 max-w-2xl text-[clamp(0.9375rem,1.5vw,1.1875rem)] text-dz-muted">
            Connect with our vibrant community sharing their wellness journeys.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 md:gap-6">
          {instagramProfiles.map((profile, index) => (
            <div key={index} className="group text-center">
              <div className="relative mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full border-[3px] border-dz-surface ring-2 ring-primary/20 sm:h-16 sm:w-16 md:h-20 md:w-20">
                <img src={profile.image} alt={profile.handle} className="h-full w-full object-cover" />
              </div>
              <p className="truncate text-xs font-medium text-primary">{profile.handle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}