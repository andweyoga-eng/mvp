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
    <section id="vibe" className="py-20 bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">and We Vibe</h2>
          <p className="text-lg text-purple-500 max-w-3xl mx-auto">
            Connect with our vibrant community of yoga enthusiasts sharing their wellness journeys on social media.
          </p>
        </div>

        {/* 4x5 Instagram Profile Grid - Responsive */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4">
          {instagramProfiles.map((profile, index) => (
            <div key={index} className="text-center group">
              <div className="relative mb-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto rounded-full border-2 border-purple-300 overflow-hidden group-hover:border-purple-500 transition-colors duration-300">
                  <img
                    src={profile.image}
                    alt={profile.handle}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <p className="text-xs text-purple-600 font-medium truncate">{profile.handle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}