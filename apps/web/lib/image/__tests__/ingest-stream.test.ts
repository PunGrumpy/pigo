import { describe, expect, it, spyOn } from "bun:test";

import { MAX_FILES } from "../constants";
import { streamIngest } from "../ingest-stream";
import type { IngestHandlers } from "../ingest-stream";
import type { ImageJob } from "../types";

const makeFile = (name: string) =>
  new File(["data"], name, { type: "image/jpeg" });

const makeJob = (name: string): ImageJob => ({
  file: makeFile(name),
  height: 10,
  id: name,
  inputFormat: "jpeg",
  name,
  originalSize: 4,
  originalUrl: `blob:original-${name}`,
  slider: 50,
  status: "queued",
  thumbnailUrl: null,
  width: 10,
});

interface Gate {
  promise: Promise<void>;
  open: () => void;
}

const createGate = (): Gate => {
  let open!: () => void;
  // oxlint-disable-next-line promise/avoid-new
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, promise };
};

const flush = () =>
  // oxlint-disable-next-line promise/avoid-new
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

const recorder = (isCancelled = () => false) => {
  const events: string[] = [];
  const handlers: IngestHandlers = {
    isCancelled,
    onJob: (job) => events.push(`job:${job.name}`),
    onMessage: (message) => events.push(`message:${message}`),
    onSettled: () => events.push("settled"),
  };
  return { events, handlers };
};

describe("streamIngest", () => {
  it("delivers rows in drop order even when a later file finishes first", async () => {
    const gates = new Map<string, Gate>([
      ["a.jpg", createGate()],
      ["b.jpg", createGate()],
      ["c.jpg", createGate()],
    ]);
    const { events, handlers } = recorder();

    const done = streamIngest(
      [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg")],
      0,
      handlers,
      async (file) => {
        await gates.get(file.name)?.promise;
        return makeJob(file.name);
      }
    );

    gates.get("b.jpg")?.open();
    await flush();
    expect(events).toEqual([]);

    gates.get("a.jpg")?.open();
    await flush();
    // The first row shows up while c.jpg is still reading.
    expect(events).toEqual(["job:a.jpg", "settled", "job:b.jpg", "settled"]);

    gates.get("c.jpg")?.open();
    await done;
    expect(events.slice(4)).toEqual(["job:c.jpg", "settled"]);
  });

  it("settles every input file once, including rejected ones", async () => {
    const { events, handlers } = recorder();
    const files = [
      makeFile("a.jpg"),
      new File(["x"], "notes.txt", { type: "text/plain" }),
      makeFile("b.jpg"),
    ];

    await streamIngest(files, 0, handlers, (file) =>
      Promise.resolve(makeJob(file.name))
    );

    expect(events.filter((event) => event === "settled")).toHaveLength(3);
    expect(events.filter((event) => event.startsWith("message:"))).toHaveLength(
      1
    );
    expect(events.filter((event) => event.startsWith("job:"))).toEqual([
      "job:a.jpg",
      "job:b.jpg",
    ]);
  });

  it("settles files past the MAX_FILES ceiling so the claim does not leak", async () => {
    const { events, handlers } = recorder();

    await streamIngest(
      [makeFile("a.jpg"), makeFile("b.jpg")],
      MAX_FILES - 1,
      handlers,
      (file) => Promise.resolve(makeJob(file.name))
    );

    expect(events.filter((event) => event.startsWith("job:"))).toEqual([
      "job:a.jpg",
    ]);
    expect(events.filter((event) => event.startsWith("message:"))).toHaveLength(
      1
    );
    expect(events.filter((event) => event === "settled")).toHaveLength(2);
  });

  it("reports a failed file as a message in place", async () => {
    const { events, handlers } = recorder();

    await streamIngest(
      [makeFile("a.jpg"), makeFile("b.jpg")],
      0,
      handlers,
      (file) =>
        Promise.resolve(file.name === "a.jpg" ? "a.jpg failed." : makeJob("b"))
    );

    expect(events).toEqual([
      "message:a.jpg failed.",
      "settled",
      "job:b",
      "settled",
    ]);
  });

  it("revokes and drops an outcome that finishes after cancellation", async () => {
    const revokeSpy = spyOn(URL, "revokeObjectURL");
    const gate = createGate();
    let cancelled = false;
    const { events, handlers } = recorder(() => cancelled);

    const done = streamIngest(
      [makeFile("a.jpg")],
      0,
      handlers,
      async (file) => {
        await gate.promise;
        return makeJob(file.name);
      }
    );

    cancelled = true;
    gate.open();
    await done;

    expect(events).toEqual(["settled"]);
    expect(revokeSpy.mock.calls.map((call) => call[0])).toContain(
      "blob:original-a.jpg"
    );
    revokeSpy.mockRestore();
  });
});
