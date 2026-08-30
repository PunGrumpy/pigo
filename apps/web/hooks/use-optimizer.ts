"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compressWithApi } from "@/lib/compress/api";
import { compressWithBrowser } from "@/lib/compress/browser";
import { downloadAll, downloadJob } from "@/lib/compress/download";
import { MAX_CONCURRENT_JOBS, runWithConcurrency } from "@/lib/compress/pool";
import {
  DEFAULT_COMPRESSION_OPTIONS,
  sanitizeCompressionOptions,
} from "@/lib/image/constants";
import { shouldUseBrowserEncoder } from "@/lib/image/format";
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
  const qualityApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const generationRef = useRef<Map<string, number>>(
    null as unknown as Map<string, number>
  );
  if (generationRef.current === (null as unknown as Map<string, number>)) {
    generationRef.current = new Map();
  }
  const abortControllersRef = useRef<Map<string, AbortController>>(
    null as unknown as Map<string, AbortController>
  );
  if (
    abortControllersRef.current ===
    (null as unknown as Map<string, AbortController>)
  ) {
    abortControllersRef.current = new Map();
  }
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

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

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

  const updateJob = useCallback(
    (id: string, updater: (job: ImageJob) => ImageJob) => {
      setJobs((current) =>
        current.map((job) => (job.id === id ? updater(job) : job))
      );
    },
    []
  );

  const invalidateJob = useCallback((id: string) => {
    abortControllersRef.current.get(id)?.abort();
    const nextGeneration = (generationRef.current.get(id) ?? 0) + 1;
    generationRef.current.set(id, nextGeneration);
    return nextGeneration;
  }, []);

  // Removal deletes the job's generation entry outright, so a dropped job reads
  // as stale here for the same reason a superseded one does.
  const isJobRunStale = useCallback(
    (id: string, generation: number) =>
      generationRef.current.get(id) !== generation,
    []
  );

  const runJob = useCallback(
    async (
      job: ImageJob,
      nextOptions: CompressionOptions,
      generation: number
    ) => {
      // Jobs wait their turn in the pool, so a newer batch may have superseded
      // this one before it ever started. Skip the work rather than race it.
      if (isJobRunStale(job.id, generation)) {
        return;
      }

      const resolvedOptions = sanitizeCompressionOptions(nextOptions);

      const prior = jobsRef.current.find((entry) => entry.id === job.id);
      if (prior?.result?.url) {
        URL.revokeObjectURL(prior.result.url);
      }

      updateJob(job.id, (current) => ({
        ...current,
        error: undefined,
        result: undefined,
        status: "processing",
      }));

      const controller = new AbortController();
      abortControllersRef.current.set(job.id, controller);

      try {
        const result = shouldUseBrowserEncoder(
          job.inputFormat,
          resolvedOptions.outputFormat
        )
          ? await compressWithBrowser(job, resolvedOptions)
          : await compressWithApi(job, resolvedOptions, controller.signal);

        if (isJobRunStale(job.id, generation)) {
          URL.revokeObjectURL(result.url);
          return;
        }

        updateJob(job.id, (current) => ({
          ...current,
          result,
          slider: current.slider || 50,
          status: "done",
        }));
      } catch (error) {
        if (isJobRunStale(job.id, generation)) {
          return;
        }

        const message = describeCompressionError(error);

        updateJob(job.id, (current) => ({
          ...current,
          error: message,
          status: "error",
        }));
      }
    },
    [isJobRunStale, updateJob]
  );

  /**
   * Claims a generation for every job up front, then works through the batch a
   * few at a time. Claiming first means a later batch supersedes this one
   * wholesale — jobs still queued here see a stale generation and bail.
   */
  const startBatch = useCallback(
    (batch: readonly ImageJob[], nextOptions: CompressionOptions) => {
      if (batch.length === 0) {
        return;
      }

      const generations = new Map(
        batch.map((job) => [job.id, invalidateJob(job.id)])
      );

      void runWithConcurrency(batch, MAX_CONCURRENT_JOBS, (job) =>
        runJob(job, nextOptions, generations.get(job.id) ?? 0)
      );
    },
    [invalidateJob, runJob]
  );

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

      setJobs((current) => [...current, ...nextJobs]);
      setSelectedId((current) => current ?? nextJobs[0]?.id ?? null);
      startBatch(nextJobs, optionsRef.current);
    },
    [startBatch]
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
    startBatch(jobsRef.current, resolved);
  }, [clearQualityTimer, startBatch]);

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

  const removeJob = useCallback((id: string) => {
    const removed = jobsRef.current.find((job) => job.id === id);
    if (removed) {
      revokeJobUrls(removed);
    }

    const remaining = jobsRef.current.filter((job) => job.id !== id);
    setJobs(remaining);
    setSelectedId((currentSelected) =>
      currentSelected === id ? (remaining[0]?.id ?? null) : currentSelected
    );

    abortControllersRef.current.get(id)?.abort();
    abortControllersRef.current.delete(id);
    generationRef.current.delete(id);
  }, []);

  const clearAll = useCallback(() => {
    for (const job of jobsRef.current) {
      revokeJobUrls(job);
    }

    setJobs([]);
    setSelectedId(null);
    setOptionsDirty(false);
    setNotice(null);
    for (const controller of abortControllersRef.current.values()) {
      controller.abort();
    }
    abortControllersRef.current.clear();
    generationRef.current.clear();
  }, []);

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
