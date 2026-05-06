import { HeroSection } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Features } from '@/components/landing/features';
import { StatsSection } from '@/components/landing/stats';
import { Testimonials } from '@/components/landing/testimonials';
import { Pricing } from '@/components/landing/pricing';
import { FAQSection } from '@/components/landing/faq';
import { FinalCTA } from '@/components/landing/final-cta';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main id="main-content" className="flex-1">
      <HeroSection />
      <HowItWorks />
      <Features />
      <StatsSection />
      <Testimonials />
      <Pricing />
      <FAQSection />
      <FinalCTA />
    </main>
  );
}
