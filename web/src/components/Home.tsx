import Files from "@/components/Files";
import BreadcrumbNavigation from "@/components/BreadcrumbNavigation";

const Home = () => {
  return (
    <div class={"flex h-[100dvh] flex-col bg-[#eff6ff] px-1 pb-1 shadow-2xl"}>
      <BreadcrumbNavigation />
      <Files />
    </div>
  );
};

export default Home;
