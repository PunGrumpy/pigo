import { OptimizerControlsPanel } from "@/components/optimizer-controls-panel";
import { OptimizerHeader } from "@/components/optimizer-header";
import { OptimizerPreviewPanel } from "@/components/optimizer-preview-panel";
import { OptimizerQueuePanel } from "@/components/optimizer-queue-panel";
import { DragDropProvider } from "@/components/providers/drag-drop-provider";
import { OptimizerProvider } from "@/components/providers/optimizer-provider";

const Home = () => (
  <OptimizerProvider>
    <DragDropProvider>
      <div className="flex min-h-dvh flex-col bg-background-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:fixed lg:inset-0 lg:overflow-hidden">
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-3 px-3 py-3 md:gap-4 md:px-6 md:py-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
          <OptimizerHeader />

          <main className="flex flex-col gap-3 md:gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_18rem] lg:grid-rows-1 lg:items-stretch lg:gap-6 lg:overflow-hidden">
            <OptimizerQueuePanel />
            <OptimizerPreviewPanel />
            <OptimizerControlsPanel />
          </main>
        </div>
      </div>
    </DragDropProvider>
  </OptimizerProvider>
);

export default Home;
