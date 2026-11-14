export interface Post {
  id: string;
  /** Canonical URL path, e.g. /2025/06/slug.kehem */
  path: string;
  title: string;
  category: string;
  /** Display date (already localised) */
  date: string;
  /** ISO date used for sorting */
  iso: string;
  author: string;
  tags: string[];
  image: string;
  excerpt: string;
  featured: boolean;
  /** Estimated reading time in minutes */
  minutes: number;
}

export interface PostDetail extends Post {
  /** Sanitised article HTML */
  content: string;
}

export interface Author {
  name: string;
  role: string;
  image: string;
  bio: string;
  count: number;
}

export interface PdfBook {
  id: string;
  title: string;
  published: string;
  cover: string;
  file: string;
}

export interface Site {
  hero: string[];
  special: string[];
  literature: string[];
  videos: string[];
  pdfs: PdfBook[];
  ad: { href: string; image: string };
  issues: string[];
  issueCounts: Record<string, number>;
}

export interface Category {
  name: string;
  count: number;
  /** Font Awesome icon name chosen in the dashboard, without the "fa-" prefix */
  icon?: string;
}

export interface Comment {
  id: string;
  name: string;
  address: string;
  text: string;
  date: string;
  picture: string;
}

/** What a page module hands back to the router. */
export interface View {
  title: string;
  description?: string;
  html: string;
  /** Runs after the HTML is in the DOM. May return a cleanup function. */
  mount?: (root: HTMLElement) => void | (() => void);
}

export interface RouteContext {
  params: string[];
  query: URLSearchParams;
  path: string;
}
