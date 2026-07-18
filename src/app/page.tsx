import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StatRow from "@/components/StatRow";
import AppShowcase from "@/components/AppShowcase";
import HowItWorks from "@/components/HowItWorks";
import FeedMockup from "@/components/FeedMockup";
import Faq from "@/components/Faq";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase-server";
import { getTotalFocusMinutes } from "@/lib/queries";

// Canonical lives here (not the root layout) so it applies only to the landing
// page and never cascades to other routes.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  // Auth-aware landing: signed-in visitors get "Open Seshn → /feed" instead of
  // sign-in prompts. Reading the session makes this page render dynamically.
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    totalMinutes,
  ] = await Promise.all([supabase.auth.getUser(), getTotalFocusMinutes()]);
  const isAuthed = !!user;

  return (
    <>
      <Navbar isAuthed={isAuthed} />
      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <StatRow totalMinutes={totalMinutes} />
        <AppShowcase />
        <HowItWorks />
        <FeedMockup />
        <Faq />
        <FinalCta isAuthed={isAuthed} />
      </main>
      <Footer />
    </>
  );
}
