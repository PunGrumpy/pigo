"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { compressWithApi } from "@/lib/compress/api";
import { compressWithBrowser } from "@/lib/compress/browser";
import { downloadAll, downloadJob } from "@/lib/compress/download";
import {
  DEFAULT_COMPRESSION_OPTIONS,
  sanitizeCompressionOptions,
} from "@/lib/image/constants";
import { shouldUseBrowserEncoder } from "@/lib/image/format";
import { ingestFiles } from "@/lib/image/ingest";
import { isJobPending } from "@/lib/image/job";
import { revokeJobUrls } from "@/lib/image/revoke";
import type { CompressionOptions, ImageJob } from "@/lib/image/types";

export const useOptimizer = () => {
  const jobsRef = useRef<ImageJob[]>([]);
  const optionsRef = useRef<CompressionOptions>({
    ...DEFAULT_COMPRESSION_OPTIONS,
  });
  const qualityApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const generationRef = useRef<Map<string, number>>(new Map());
  const removedIdsRef = useRef<Set<string>>(new Set());
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<CompressionOptions>({
    ...DEFAULT_COMPRESSION_OPTIONS,
  });
  const [optionsDirty, setOptionsDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
  const isProcessing = jobs.some(isJobPending);
  const totalOriginal = completedJobs.reduce(
    (sum, job) => sum + job.originalSize,
    0
  );
  const totalCompressed = completedJobs.reduce(
    (sum, job) => sum + (job.result?.size ?? 0),
    0
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
    const nextGeneration = (generationRef.current.get(id) ?? 0) + 1;
    generationRef.current.set(id, nextGeneration);
    return nextGeneration;
  }, []);

  const isJobRunStale = useCallback((id: string, generation: number) => {
    if (removedIdsRef.current.has(id)) {
      return true;
    }
    return generationRef.current.get(id) !== generation;
  }, []);

  const runJob = useCallback(
    async (job: ImageJob, nextOptions: CompressionOptions) => {
      const generation = invalidateJob(job.id);
      const resolvedOptions = sanitizeCompressionOptions(nextOptions);

      updateJob(job.id, (current) => {
        if (current.result?.url) {
          URL.revokeObjectURL(current.result.url);
        }
        return {
          ...current,
          error: undefined,
          result: undefined,
          status: "processing",
        };
      });

      try {
        const result = shouldUseBrowserEncoder(
          job.inputFormat,
          resolvedOptions.outputFormat
        )
          ? await compressWithBrowser(job, resolvedOptions)
          : await compressWithApi(job, resolvedOptions);

        if (isJobRunStale(job.id, generation)) {
          URL.revokeObjectURL(result.url);
          removedIdsRef.current.delete(job.id);
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
          removedIdsRef.current.delete(job.id);
          return;
        }

        updateJob(job.id, (current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Compression failed",
          status: "error",
        }));
      }
    },
    [invalidateJob, isJobRunStale, updateJob]
  );

  const addFiles = useCallback(
    async (fileList: File[] | FileList) => {
      setNotice(null);
      const { jobs: nextJobs, messages } = await ingestFiles(
        [...fileList],
        jobsRef.current.length
      );

      if (messages.length > 0) {
        setNotice(messages.slice(0, 3).join(" "));
      }
      if (nextJobs.length === 0) {
        return;
      }

      setJobs((current) => [...current, ...nextJobs]);
      setSelectedId((current) => current ?? nextJobs[0]?.id ?? null);
      for (const job of nextJobs) {
        void runJob(job, optionsRef.current);
      }
    },
    [runJob]
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
      void runJob(job, resolved);
    }
  }, [clearQualityTimer, runJob]);

  const scheduleQualityApply = useCallback(() => {
    clearQualityTimer();
    qualityApplyTimerRef.current = setTimeout(() => {
      qualityApplyTimerRef.current = null;
      applyOptions();
    }, 300);
  }, [applyOptions, clearQualityTimer]);

  const patchOptions = useCallback(
    (patch: Partial<CompressionOptions>, autoApply = false) => {
      setOptions((current) => {
        const next = sanitizeCompressionOptions({ ...current, ...patch });
        optionsRef.current = next;
        if (autoApply) {
          queueMicrotask(() => applyOptions());
        } else if ("quality" in patch && Object.keys(patch).length === 1) {
          setOptionsDirty(false);
          scheduleQualityApply();
        } else {
          setOptionsDirty(true);
        }
        return next;
      });
    },
    [applyOptions, scheduleQualityApply]
  );

  const removeJob = useCallback(
    (id: string) => {
      removedIdsRef.current.add(id);
      invalidateJob(id);

      setJobs((current) => {
        const removed = current.find((job) => job.id === id);
        if (removed) {
          revokeJobUrls(removed);
        }

        const remaining = current.filter((job) => job.id !== id);
        setSelectedId((currentSelected) =>
          currentSelected === id ? (remaining[0]?.id ?? null) : currentSelected
        );
        return remaining;
      });

      generationRef.current.delete(id);
    },
    [invalidateJob]
  );

  const clearAll = useCallback(() => {
    for (const job of jobsRef.current) {
      removedIdsRef.current.add(job.id);
      invalidateJob(job.id);
      revokeJobUrls(job);
    }

    setJobs([]);
    setSelectedId(null);
    setOptionsDirty(false);
    setNotice(null);
    generationRef.current.clear();
  }, [invalidateJob]);

  return {
    addFiles,
    applyOptions,
    clearAll,
    completedJobs,
    downloadAll: () => void downloadAll(jobsRef.current),
    downloadJob,
    isProcessing,
    jobs,
    notice,
    options,
    optionsDirty,
    patchOptions,
    removeJob,
    selectedId,
    selectedJob,
    setSelectedId,
    totalCompressed,
    totalOriginal,
    updateJob,
  };
};
