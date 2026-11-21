/** Props halaman landing, disusun oleh App\Support\LandingPage. */

export interface HeroContent {
    badge: string;
    title: string;
    highlight: string;
    subtitle: string;
    primary_label: string;
    secondary_label: string;
    points: string[];
    image: string;
}

export interface AboutContent {
    label: string;
    title: string;
    lead: string;
    body: string;
    vision: string;
    mission: string[];
    image: string;
}

export interface Heading {
    title: string;
    subtitle: string;
}

export interface LandingContent {
    hero: HeroContent;
    about: AboutContent;
    services_heading: Heading;
    packages: Heading & { badge: string; count: number };
    gallery: Heading;
    testimonials: Heading;
}

export type ServiceIcon = 'kaabah' | 'plane' | 'passport';

export interface Service {
    title: string;
    text: string;
    image: string | null;
    icon: ServiceIcon;
    url: string;
}

export interface LandingPackage {
    id: number;
    name: string;
    url: string;
    price: number;
    is_best_seller: boolean;
    airline: string | null;
    airline_logo: string | null;
    duration_days: number;
    departure_date: string | null;
    hotel: string | null;
    hotel_star: number | null;
    meal: string | null;
    facilities: string[];
}

export interface GalleryPhoto {
    id: number | string;
    title: string | null;
    image_url: string;
}

export interface Testimonial {
    id: number;
    name: string;
    city: string | null;
    content: string;
    rating: number;
    departure_month: string | null;
    package_name: string | null;
    photo_url: string | null;
}

export interface RatingSummary {
    average: number;
    count: number;
}

export interface SocialLink {
    key: 'instagram' | 'facebook' | 'youtube' | 'tiktok';
    label: string;
    url: string | null;
}

export interface LandingProps {
    content: LandingContent;
    services: Service[];
    packages: LandingPackage[];
    packageOptions: string[];
    galleries: GalleryPhoto[];
    testimonials: Testimonial[];
    rating: RatingSummary;
}

/** Props bersama dari HandleInertiaRequests yang dipakai landing. */
export interface SharedProps {
    auth: { user: { name: string; is_admin: boolean } | null };
    company: { name: string; tagline: string; address: string; phone: string; email: string; whatsapp: string; socials: SocialLink[] };
    flash: { success: string | null; error: string | null };
    [key: string]: unknown;
}
