import { OptimizerControlsPanel } from "@/components/optimizer-controls-panel";
import { OptimizerPreviewPanel } from "@/components/optimizer-preview-panel";
import { OptimizerQueuePanel } from "@/components/optimizer-queue-panel";
import { OptimizerTopBar } from "@/components/optimizer-top-bar";
import { DragDropProvider } from "@/components/providers/drag-drop-provider";
import { OptimizerProvider } from "@/components/providers/optimizer-provider";

const Home = () => (
  <OptimizerProvider>
    <DragDropProvider>
      <div className="flex min-h-dvh w-screen flex-col bg-background-100 text-gray-1000 lg:h-dvh lg:flex-row lg:overflow-hidden">
        <OptimizerQueuePanel />

        <div className="flex flex-1 flex-col bg-background-100 lg:overflow-hidden">
          <OptimizerTopBar />
          <main className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
            <div className="flex flex-1 flex-col p-4 md:p-6 lg:overflow-hidden">
              <OptimizerPreviewPanel />
            </div>

            <OptimizerControlsPanel />
          </main>
        </div>
      </div>
    </DragDropProvider>
  </OptimizerProvider>
);

export default Home;
