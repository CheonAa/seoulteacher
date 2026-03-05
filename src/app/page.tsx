import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Landing Components
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import NoticeBar from "@/components/landing/NoticeBar";
import FeatureCards from "@/components/landing/FeatureCards";
import EducationalFocus from "@/components/landing/EducationalFocus";
import CurriculumSection from "@/components/landing/CurriculumSection";
import LocationSection from "@/components/landing/LocationSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // If user is authenticated, redirect to their dashboard
  if (session) {
    const role = session.user?.role;
    if (role === "OWNER") {
      redirect("/owner");
    } else if (role === "ADMIN") {
      redirect("/admin");
    } else if (role === "INSTRUCTOR") {
      redirect("/instructor");
    }
  }

  // Fetch all system settings for the landing page
  const settingsData: Record<string, string> = {};
  let systemLogo = "";
  let siteName = "HANOI SEOUL ACADEMY";

  try {
    const settings = await prisma.systemSettings.findMany();

    settings.forEach(s => {
      settingsData[s.key] = s.value;
      if (s.key === "SYSTEM_LOGO") systemLogo = s.value;
      if (s.key === "SITE_NAME") siteName = s.value;
    });
  } catch (error) {
    console.error("Failed to fetch landing page settings:", error);
  }

  // Unauthenticated users see the landing page
  return (
    <div className="min-h-screen font-sans selection:bg-blue-200">
      <LandingHeader logoBase64={systemLogo} siteName={siteName} />
      <main>
        <HeroSection />
        <NoticeBar />
        <FeatureCards />
        <EducationalFocus />
        <CurriculumSection />
        <LocationSection />
      </main>
      <LandingFooter settings={settingsData} />
    </div>
  );
}
