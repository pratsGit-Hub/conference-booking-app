import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EEF4FF]">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="fixed left-0 right-0 top-0 z-50">
        <Navbar />
      </header>

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <Sidebar />

      {/* =================================================
          MAIN APPLICATION AREA
      ================================================= */}

      <main
        className="
          min-h-screen
          min-w-0
          bg-[#EEF4FF]
          pt-[76px]
          lg:ml-[263px]
        "
      >
        {children}
      </main>

    </div>
  );
}