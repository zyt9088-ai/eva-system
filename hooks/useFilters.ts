"use client";

import { useState } from "react";

export function useFilters(initialData: any[]) {
  const [activeTab, setActiveTab] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  let filteredAndSortedData =
    activeTab === "ALL"
      ? initialData
      : initialData.filter((ev) => ev.type === activeTab);

  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      const vendorNames = ev.vendors
        ? ev.vendors.map((v: any) => v.name).join(" ")
        : ev.vendorName || "";
      return (
        ev.projectName?.toLowerCase().includes(lower) ||
        vendorNames.toLowerCase().includes(lower) ||
        ev.prNumber?.toLowerCase().includes(lower)
      );
    });
  }

  if (filterStatus !== "ALL") {
    filteredAndSortedData = filteredAndSortedData.filter((ev) => {
      if (filterStatus === "PENDING") return ev.status === "PENDING";
      if (filterStatus === "EVALUATED") return ev.status === "EVALUATED";
      if (filterStatus === "AWAITING_JUSTIFICATION")
        return ev.status === "AWAITING_JUSTIFICATION";
      if (filterStatus === "APPROVED") return ev.status === "APPROVED";
      return true;
    });
  }

  // TODO: Refactor sorting to use getHighestScore properly if score_high is selected
  filteredAndSortedData.sort((a, b) => {
    if (sortBy === "newest") {
      return (
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
      );
    }
    return 0;
  });

  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedData,
  };
}
