// ISR: without this the page is prerendered once at build time and the
// waitlist count freezes. Must be a statically analyzable literal (no `60 * 1`).
export const revalidate = 60;

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StatRow from "@/components/StatRow";
import HowItWorks from "@/components/HowItWorks";
import FeedMockup from "@/components/FeedMockup";
import Waitlist from "@/components/Waitlist";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <StatRow />
        <HowItWorks />
        <FeedMockup />
        <Waitlist />
      </main>
      <Footer />
    </>
  );
}
