import embraceImage from "@assets/embrace-carousel.png";
import experienceImage from "@assets/experience_1756460037530.jpg";
import expressImage from "@assets/express_1756460037530.jpg";
import evolveImage from "@assets/evolve-carousel.png";
import elevateImage from "@assets/elevate-carousel.png";
import becomeImage from "@assets/become-carousel.png";
import type { HeroSlideWord } from "@shared/hero-cta";

const HERO_SLIDE_IMAGES: Record<HeroSlideWord, string> = {
  Embrace: embraceImage,
  Experience: experienceImage,
  Express: expressImage,
  Evolve: evolveImage,
  Elevate: elevateImage,
  Become: becomeImage,
};

/** Custom upload when set, otherwise the built-in photo for that slide. */
export function heroSlideImageSrc(slide: {
  word: HeroSlideWord;
  imageUrl: string | null;
}): string {
  return slide.imageUrl || HERO_SLIDE_IMAGES[slide.word];
}
