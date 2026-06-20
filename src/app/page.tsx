import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StatRow from "@/components/StatRow";
import HowItWorks from "@/components/HowItWorks";
import FeedMockup from "@/components/FeedMockup";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase-server";

export default async function Home() {
  // Auth-aware landing: signed-in visitors get "Open Seshn → /feed" instead of
  // sign-in prompts. Reading the session makes this page render dynamically.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  return (
    <>
      <Navbar isAuthed={isAuthed} />
      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <StatRow />
        <HowItWorks />
        <FeedMockup />
        <FinalCta isAuthed={isAuthed} />
      </main>
      <Footer />
    </>
  );
}
