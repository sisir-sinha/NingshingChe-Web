import Swiper from 'swiper';
import { A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination } from 'swiper/modules';
import type { SwiperOptions } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Create a Swiper inside `root` for the element marked data-slider="name".
 * Prev/next buttons are matched by data-prev="name" / data-next="name".
 */
export function slider(root: HTMLElement, name: string, options: SwiperOptions = {}): Swiper | null {
  const el = root.querySelector<HTMLElement>(`[data-slider="${name}"]`);
  if (!el) return null;
  return new Swiper(el, {
    modules: [A11y, Autoplay, EffectFade, Keyboard, Navigation, Pagination],
    navigation: {
      prevEl: root.querySelector<HTMLElement>(`[data-prev="${name}"]`),
      nextEl: root.querySelector<HTMLElement>(`[data-next="${name}"]`),
    },
    keyboard: { enabled: true, onlyInViewport: true },
    speed: reduced() ? 0 : 500,
    ...options,
    autoplay: reduced() ? false : options.autoplay,
  });
}

/** Destroy a group of sliders when leaving the page. */
export function destroyAll(list: (Swiper | null)[]): void {
  for (const s of list) s?.destroy(true, true);
}
