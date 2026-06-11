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
