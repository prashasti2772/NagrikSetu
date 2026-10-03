import HeroSection from "../components/home/HeroSection";
import StatsSection from "../components/home/StatsSection";
import ResolutionProcess from "../components/home/ResolutionProcess";
import CategoriesSection from "../components/home/CategoriesSection";
import ComplaintTracker from "../components/home/ComplaintTracker";


export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      <main>
        <HeroSection />

        <StatsSection />

        <ResolutionProcess />

        <CategoriesSection />

        <ComplaintTracker />
      </main>

    </div>
  );
}