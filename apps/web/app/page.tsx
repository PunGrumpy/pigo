import { OptimizerControlsPanel } from "@/components/optimizer-controls-panel";
import { OptimizerPreviewPanel } from "@/components/optimizer-preview-panel";
import { OptimizerQueuePanel } from "@/components/optimizer-queue-panel";
import { OptimizerTopBar } from "@/components/optimizer-top-bar";
import { DragDropProvider } from "@/components/providers/drag-drop-provider";
import { OptimizerProvider } from "@/components/providers/optimizer-provider";

const Home = () => (
  <OptimizerProvider>
    <DragDropProvider>
      <div className="flex h-dvh w-screen overflow-hidden bg-background-100 text-gray-1000">
        <OptimizerQueuePanel />

        <div className="flex flex-1 flex-col overflow-hidden bg-background-100">
          <OptimizerTopBar />
          <main className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden p-6">
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
