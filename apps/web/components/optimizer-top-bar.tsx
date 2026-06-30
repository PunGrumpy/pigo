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
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-alpha-400 bg-background-100 px-6">
      <nav
        aria-label="Filter image queue"
        className="flex h-full items-center gap-1 -ml-4"
      >
        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors",
            filterTab === "all"
              ? "text-gray-1000"
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
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-full bg-gray-1000"
            />
          )}
        </button>

        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors",
            filterTab === "optimized"
              ? "text-gray-1000"
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
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-full bg-gray-1000"
            />
          )}
        </button>

        <button
          className={cn(
            "relative flex h-full items-center px-4 text-label-14 font-medium transition-colors",
            filterTab === "errors"
              ? "text-gray-1000"
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
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 w-full bg-gray-1000"
            />
          )}
        </button>
      </nav>

      <div className="relative w-64">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-700">
          <Search className="size-4" />
        </span>
        <input
          aria-label="Search images"
          className={cn(
            "h-8 w-full rounded-md border border-gray-alpha-400 bg-background-100 pl-9 pr-3 text-label-13 text-gray-1000 outline-none transition-[border-color,box-shadow]",
            "hover:border-gray-alpha-500",
            "focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
          )}
          placeholder="Search images..."
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
    </div>
  );
};
