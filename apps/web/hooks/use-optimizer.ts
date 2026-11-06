"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { downloadAll, downloadJob } from "@/lib/compress/download";
import { encodeJob } from "@/lib/compress/encode";
import { MAX_CONCURRENT_JOBS } from "@/lib/compress/pool";
import { createScheduler } from "@/lib/compress/scheduler";
import type { Scheduler } from "@/lib/compress/scheduler";
import {
  DEFAULT_COMPRESSION_OPTIONS,
  sanitizeCompressionOptions,
} from "@/lib/image/constants";
import { ingestFiles } from "@/lib/image/ingest";
import { isJobPending } from "@/lib/image/job";
import { revokeJobUrls } from "@/lib/image/revoke";
import type { CompressionOptions, ImageJob } from "@/lib/image/types";

export type FilterTab = "all" | "optimized" | "errors";

const describeCompressionError = (error: unknown): string => {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "The API did not respond in time.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Compression failed";
};

export const useOptimizer = () => {
  const jobsRef = useRef<ImageJob[]>([]);
  const optionsRef = useRef<CompressionOptions>({
    ...DEFAULT_COMPRESSION_OPTIONS,
  });
  // addFiles reads jobsRef.current.length before an await; a second drop
  // during a slow ingest would otherwise see the pre-ingest count and bypass
  // the MAX_FILES ceiling. This tracks files already claimed but not yet
  // committed to jobsRef.
  const pendingIngestRef = useRef(0);
  const schedulerRef = useRef<Scheduler<CompressionOptions> | null>(null);
  const qualityApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<CompressionOptions>({
    ...DEFAULT_COMPRESSION_OPTIONS,
  });
  const [optionsDirty, setOptionsDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [zipGenerating, setZipGenerating] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  const filteredJobs = useMemo(() => {
    const needle = searchQuery.toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch = job.name.toLowerCase().includes(needle);
      const matchesTab =
        filterTab === "all" ||
        (filterTab === "optimized" && job.status === "done") ||
        (filterTab === "errors" && job.status === "error");
      return matchesSearch && matchesTab;
    });
  }, [jobs, searchQuery, filterTab]);

  const clearQualityTimer = useCallback(() => {
    if (qualityApplyTimerRef.current) {
      clearTimeout(qualityApplyTimerRef.current);
      qualityApplyTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearQualityTimer();
      for (const job of jobsRef.current) {
        revokeJobUrls(job);
      }
    },
    [clearQualityTimer]
  );

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null,
    [jobs, selectedId]
  );

  const completedJobs = useMemo(() => jobs.filter((job) => job.result), [jobs]);
  const isProcessing = useMemo(() => jobs.some(isJobPending), [jobs]);
  const totalOriginal = useMemo(
    () => completedJobs.reduce((sum, job) => sum + job.originalSize, 0),
    [completedJobs]
  );
  const totalCompressed = useMemo(
    () => completedJobs.reduce((sum, job) => sum + (job.result?.size ?? 0), 0),
    [completedJobs]
  );
  const processedCount = useMemo(
    () =>
      jobs.filter((job) => job.status === "done" || job.status === "error")
        .length,
    [jobs]
  );
  const processPercent = useMemo(
    () =>
      jobs.length > 0 ? Math.round((processedCount / jobs.length) * 100) : 0,
    [jobs.length, processedCount]
  );

  // Every change goes through here so jobsRef is current the moment a job is
  // added or removed. A render-lagged mirror would let the scheduler start a
  // queued run before it could find the job.
  const commitJobs = useCallback((next: ImageJob[]) => {
    jobsRef.current = next;
    setJobs(next);
  }, []);

  const updateJob = useCallback(
    (id: string, updater: (job: ImageJob) => ImageJob) => {
      if (!jobsRef.current.some((job) => job.id === id)) {
        return;
      }
      commitJobs(
        jobsRef.current.map((job) => (job.id === id ? updater(job) : job))
      );
    },
    [commitJobs]
  );

  const runJob = useCallback(
    async (
      id: string,
      nextOptions: CompressionOptions,
      signal: AbortSignal
    ) => {
      const job = jobsRef.current.find((entry) => entry.id === id);
      if (!job || signal.aborted) {
        return;
      }

      const resolvedOptions = sanitizeCompressionOptions(nextOptions);

      if (job.result?.url) {
        URL.revokeObjectURL(job.result.url);
      }

      updateJob(id, (current) => ({
        ...current,
        error: undefined,
        result: undefined,
        status: "processing",
      }));

      try {
        const result = await encodeJob(job, resolvedOptions, signal);

        if (signal.aborted) {
          URL.revokeObjectURL(result.url);
          return;
        }

        updateJob(id, (current) => ({
          ...current,
          result,
          slider: current.slider || 50,
          status: "done",
        }));
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        const message = describeCompressionError(error);

        updateJob(id, (current) => ({
          ...current,
          error: message,
          status: "error",
        }));
      }
    },
    [updateJob]
  );

  // Built on first use rather than during render: runJob reads refs, and the
  // React compiler rejects handing such a function over while rendering. It
  // only touches refs and stable setters, so the first copy lasts the hook's
  // life.
  const getScheduler = useCallback(() => {
    if (!schedulerRef.current) {
      schedulerRef.current = createScheduler(MAX_CONCURRENT_JOBS, runJob);
    }
    return schedulerRef.current;
  }, [runJob]);

  const addFiles = useCallback(
    async (fileList: File[] | FileList) => {
      setNotice(null);
      const claimed = fileList.length;
      const startCount = jobsRef.current.length + pendingIngestRef.current;
      pendingIngestRef.current += claimed;

      let ingestResult: Awaited<ReturnType<typeof ingestFiles>>;
      try {
        ingestResult = await ingestFiles([...fileList], startCount);
      } finally {
        pendingIngestRef.current -= claimed;
      }

      const { jobs: nextJobs, messages } = ingestResult;
      if (messages.length > 0) {
        setNotice(messages.slice(0, 3).join(" "));
      }
      if (nextJobs.length === 0) {
        return;
      }

      commitJobs([...jobsRef.current, ...nextJobs]);
      setSelectedId((current) => current ?? nextJobs[0]?.id ?? null);
      for (const job of nextJobs) {
        getScheduler().request(job.id, optionsRef.current);
      }
    },
    [commitJobs, getScheduler]
  );

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length > 0) {
        event.preventDefault();
        void addFiles(files);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const applyOptions = useCallback(() => {
    const resolved = sanitizeCompressionOptions(optionsRef.current);
    optionsRef.current = resolved;
    clearQualityTimer();
    setOptionsDirty(false);
    for (const job of jobsRef.current) {
      getScheduler().request(job.id, resolved);
    }
  }, [clearQualityTimer, getScheduler]);

  const scheduleQualityApply = useCallback(() => {
    clearQualityTimer();
    qualityApplyTimerRef.current = setTimeout(() => {
      qualityApplyTimerRef.current = null;
      applyOptions();
    }, 300);
  }, [applyOptions, clearQualityTimer]);

  const patchOptions = useCallback(
    (patch: Partial<CompressionOptions>, autoApply = false) => {
      const next = sanitizeCompressionOptions({
        ...optionsRef.current,
        ...patch,
      });
      optionsRef.current = next;
      setOptions(next);

      if (autoApply) {
        queueMicrotask(() => applyOptions());
      } else if ("quality" in patch && Object.keys(patch).length === 1) {
        setOptionsDirty(false);
        scheduleQualityApply();
      } else {
        setOptionsDirty(true);
      }
    },
    [applyOptions, scheduleQualityApply]
  );

  const removeJob = useCallback(
    (id: string) => {
      const removed = jobsRef.current.find((job) => job.id === id);
      if (removed) {
        revokeJobUrls(removed);
      }

      const remaining = jobsRef.current.filter((job) => job.id !== id);
      commitJobs(remaining);
      setSelectedId((currentSelected) =>
        currentSelected === id ? (remaining[0]?.id ?? null) : currentSelected
      );

      getScheduler().cancel(id);
    },
    [commitJobs, getScheduler]
  );

  const clearAll = useCallback(() => {
    for (const job of jobsRef.current) {
      revokeJobUrls(job);
    }

    commitJobs([]);
    setSelectedId(null);
    setOptionsDirty(false);
    setNotice(null);
    getScheduler().cancelAll();
  }, [commitJobs, getScheduler]);

  const handleDownloadAll = useCallback(async () => {
    setZipGenerating(true);
    setZipProgress(0);
    try {
      await downloadAll(jobsRef.current, (percent) => {
        setZipProgress(percent);
      });
    } finally {
      setZipGenerating(false);
      setZipProgress(0);
    }
  }, []);

  // Split so that consumers which only dispatch (queue rows, buttons) can
  // subscribe to a value that never changes identity, while the reactive slice
  // re-renders only the components that actually read it.
  const actions = useMemo(
    () => ({
      addFiles,
      applyOptions,
      clearAll,
      downloadAll: handleDownloadAll,
      downloadJob,
      patchOptions,
      removeJob,
      setFilterTab,
      setSearchQuery,
      setSelectedId,
      updateJob,
    }),
    [
      addFiles,
      applyOptions,
      clearAll,
      handleDownloadAll,
      patchOptions,
      removeJob,
      updateJob,
    ]
  );

  const state = useMemo(
    () => ({
      completedJobs,
      filterTab,
      filteredJobs,
      isProcessing,
      jobs,
      notice,
      options,
      optionsDirty,
      processPercent,
      processedCount,
      searchQuery,
      selectedId,
      selectedJob,
      totalCompressed,
      totalOriginal,
      zipGenerating,
      zipProgress,
    }),
    [
      completedJobs,
      filterTab,
      filteredJobs,
      isProcessing,
      jobs,
      notice,
      options,
      optionsDirty,
      processPercent,
      processedCount,
      searchQuery,
      selectedId,
      selectedJob,
      totalCompressed,
      totalOriginal,
      zipGenerating,
      zipProgress,
    ]
  );

  return { actions, state };
};

export type OptimizerState = ReturnType<typeof useOptimizer>["state"];
export type OptimizerActions = ReturnType<typeof useOptimizer>["actions"];
