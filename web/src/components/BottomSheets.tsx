import bottomSheetsStore from "@/store/bottom_sheets";

const BottomSheets = () => {
  const { showBottomSheets, setShowBottomSheets } = bottomSheetsStore;
  return (
    <div
      class={`fixed top-0 left-0 z-40 h-[100dvh] w-[100dvw] ${showBottomSheets() ? "visible" : "invisible"}`}
      onClick={(ev) => {
        // ev.stopPropagation();
        // ev.preventDefault();
        setShowBottomSheets(false);
      }}
    >
      <div
        class={`fixed z-50 rounded-t-3xl shadow-2xl ${showBottomSheets() ? "bottom-0" : "-bottom-full"} left-0 h-[60dvh] w-screen duration-500 backdrop-blur-3xl transition-all`}
      ></div>
    </div>
  );
};

export default BottomSheets;
