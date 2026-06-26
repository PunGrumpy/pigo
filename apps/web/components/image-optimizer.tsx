"use client";

import { useRef, useState } from "react";

import { OptimizerControlsPanel } from "@/components/optimizer-controls-panel";
import { OptimizerHeader } from "@/components/optimizer-header";
import { OptimizerPreviewPanel } from "@/components/optimizer-preview-panel";
import { OptimizerQueuePanel } from "@/components/optimizer-queue-panel";
import { useOptimizer } from "@/hooks/use-optimizer";
import { ACCEPTED_MIME_TYPES } from "@/lib/image/constants";

export const ImageOptimizer = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const {
    addFiles,
    applyOptions,
    clearAll,
    completedJobs,
    downloadAll,
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
  } = useOptimizer();

  const openFilePicker = () => inputRef.current?.click();

  const onDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDropActive(false);
    if (event.dataTransfer.files.length > 0) {
      void addFiles(event.dataTransfer.files);
    }
  };

  return (
    <div
      className="flex min-h-dvh flex-col bg-background-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:fixed lg:inset-0 lg:overflow-hidden"
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDropActive(false);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDropActive(true);
      }}
      onDrop={onDrop}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-3 px-3 py-3 md:gap-4 md:px-6 md:py-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
        <OptimizerHeader
          jobCount={jobs.length}
          onClear={clearAll}
          onSelectFiles={openFilePicker}
        />

        <main className="flex flex-col gap-3 md:gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_18rem] lg:grid-rows-1 lg:items-stretch lg:gap-6 lg:overflow-hidden">
          <OptimizerQueuePanel
            dropActive={dropActive}
            isProcessing={isProcessing}
            jobs={jobs}
            notice={notice}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSelectFiles={openFilePicker}
          />
          <OptimizerPreviewPanel
            dropActive={dropActive}
            job={selectedJob}
            onDownload={downloadJob}
            onRemove={(job) => removeJob(job.id)}
            onSliderChange={(job, value) =>
              updateJob(job.id, (current) => ({ ...current, slider: value }))
            }
          />
          <OptimizerControlsPanel
            completedCount={completedJobs.length}
            isProcessing={isProcessing}
            jobCount={jobs.length}
            options={options}
            optionsDirty={optionsDirty}
            selectedJob={selectedJob}
            totalCompressed={totalCompressed}
            totalOriginal={totalOriginal}
            onApply={applyOptions}
            onDownloadAll={downloadAll}
            onPatchOptions={patchOptions}
          />
        </main>
      </div>

      <input
        ref={inputRef}
        accept={ACCEPTED_MIME_TYPES.join(",")}
        aria-label="Select images to optimize"
        className="sr-only"
        multiple
        type="file"
        onChange={(event) => {
          if (event.target.files) {
            void addFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};
