"use client";

import { Search } from "lucide-react";

import { useOptimizerContext } from "@/components/providers/optimizer-provider";
import { cn } from "@/lib/utils";

export const OptimizerTopBar = () => {
  const { jobs, searchQuery, setSearchQuery, filterTab, setFilterTab } =
    useOptimizerContext();

  const countAll = jobs.length;
  const countOptimized = jobs.filter((job) => job.status === "done").length;
  const countErrors = jobs.filter((job) => job.status === "error").length;

  return (
    <div className="flex h-14 shrink-0 items-center border-b border-gray-alpha-400 bg-background-100">
      {/* Cell 1: Filter Tabs */}
      <nav
        aria-label="Filter image queue"
        className="flex h-full items-center border-r border-gray-alpha-400 gap-1"
      >
        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors outline-none",
            "focus-visible:outline-none focus-visible:shadow-[var(--ds-focus-ring)] focus-visible:outline-2 outline-[var(--ds-focus-color)] outline-offset-[-2px]",
            filterTab === "all"
              ? "text-gray-1000 font-semibold"
              : "text-gray-800 hover:text-gray-1000"
          )}
          type="button"
          onClick={() => setFilterTab("all")}
        >
          All
          <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-900">
            {countAll}
          </span>
          {filterTab === "all" && (
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gray-1000" />
          )}
        </button>

        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors outline-none",
            "focus-visible:outline-none focus-visible:shadow-[var(--ds-focus-ring)] focus-visible:outline-2 outline-[var(--ds-focus-color)] outline-offset-[-2px]",
            filterTab === "optimized"
              ? "text-gray-1000 font-semibold"
              : "text-gray-800 hover:text-gray-1000"
          )}
          type="button"
          onClick={() => setFilterTab("optimized")}
        >
          Optimized
          <span
            className={cn(
              "ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
              countOptimized > 0
                ? "bg-green-100 border border-green-400 text-green-900"
                : "bg-gray-200 text-gray-900"
            )}
          >
            {countOptimized}
          </span>
          {filterTab === "optimized" && (
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gray-1000" />
          )}
        </button>

        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors outline-none",
            "focus-visible:outline-none focus-visible:shadow-[var(--ds-focus-ring)] focus-visible:outline-2 outline-[var(--ds-focus-color)] outline-offset-[-2px]",
            filterTab === "errors"
              ? "text-gray-1000 font-semibold"
              : "text-gray-800 hover:text-gray-1000"
          )}
          type="button"
          onClick={() => setFilterTab("errors")}
        >
          Errors
          <span
            className={cn(
              "ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
              countErrors > 0
                ? "bg-red-100 border border-red-400 text-red-900"
                : "bg-gray-200 text-gray-900"
            )}
          >
            {countErrors}
          </span>
          {filterTab === "errors" && (
            <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gray-1000" />
          )}
        </button>
      </nav>

      {/* Cell 2: Search */}
      <div className="relative flex h-full flex-1 items-center px-4 focus-within:shadow-[var(--ds-focus-ring)] focus-within:z-10 transition-shadow duration-200">
        <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-700">
          <Search className="size-4" />
        </span>
        <input
          aria-label="Search images"
          className="h-full w-full bg-transparent pl-8 pr-3 text-label-13 text-gray-1000 outline-none placeholder:text-gray-700 focus:outline-none"
          placeholder="Search images..."
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
    </div>
  );
};
