export function EvaluationTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="mb-6 flex justify-start no-print">
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200">
        {["ALL", "GENERAL", "EVF"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-6 py-2 rounded-md text-sm font-bold transition-colors duration-300 whitespace-nowrap ${
              activeTab === tab
                ? "bg-[#0D4435] text-white shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab === "ALL"
              ? "عرض الكل"
              : tab === "GENERAL"
                ? "المطابقة الفنية"
                : "التقييم الموزون"}
          </button>
        ))}
      </div>
    </div>
  );
}
