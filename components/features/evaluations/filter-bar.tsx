import { Search, Filter, List, LayoutGrid, UserCircle } from "lucide-react";
import { ModernDropdown } from "@/components/ui/modern-dropdown";

interface FilterBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  viewMode: string;
  setViewMode: (val: string) => void;
  creatorOptions?: { label: string; value: string }[];
  filterCreator?: string;
  setFilterCreator?: (val: string) => void;
}

export const FilterBar = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  creatorOptions,
  filterCreator,
  setFilterCreator,
}: FilterBarProps) => {
  const filterOptions = [
    { label: "جميع الحالات", value: "ALL" },
    { label: "بانتظار التقييم", value: "PENDING" },
    { label: "بانتظار المراجعة", value: "EVALUATED" },
    { label: "مكتمل ومعتمد", value: "APPROVED" },
  ];

  const sortOptions = [
    { label: "الأحدث ترتيباً", value: "newest" },
    { label: "الأعلى تقييماً", value: "score_high" },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8 no-print bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
      <div className="relative flex-1 w-full lg:max-w-md">
        <input
          type="text"
          placeholder="ابحث برقم PR، المشروع، المورد..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-4 pl-10 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
        {creatorOptions && creatorOptions.length > 0 && setFilterCreator && (
          <ModernDropdown
            value={filterCreator || "ALL"}
            options={[{ label: "الكل (جميع المُنشئين)", value: "ALL" }, ...creatorOptions]}
            onChange={setFilterCreator}
            placeholder="تصفية حسب المنشئ"
            icon={UserCircle}
            searchable
            className="w-48"
          />
        )}
        <ModernDropdown
          value={filterStatus}
          options={filterOptions}
          onChange={setFilterStatus}
          placeholder="تصفية حسب الحالة"
          icon={Filter}
          className="w-44"
        />
        <ModernDropdown
          value={sortBy}
          options={sortOptions}
          onChange={setSortBy}
          placeholder="ترتيب حسب"
          icon={List}
          className="w-44"
        />
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors duration-200 ${
              viewMode === "grid" ? "bg-gray-100 text-[#0D4435]" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-md transition-colors duration-200 ${
              viewMode === "table" ? "bg-gray-100 text-[#0D4435]" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
