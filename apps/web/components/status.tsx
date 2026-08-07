"use client";

import { useEffect, useState } from "react";

import { env } from "@/env";
import { cn } from "@/lib/utils";

type StatusType = "ok" | "warning" | "error" | "offline";

const fetchHealth = async (
  signal: AbortSignal
): Promise<{ status?: string } | null> => {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/health`, {
    cache: "no-store",
    signal,
  });

  if (response.ok) {
    return (await response.json()) as { status?: string };
  }

  return null;
};

export const Status = () => {
  const [status, setStatus] = useState<StatusType>("offline");

  useEffect(() => {
    const controller = new AbortController();

    const checkHealth = async (): Promise<void> => {
      try {
        const data = await fetchHealth(controller.signal);

        if (data?.status === "ok") {
          setStatus("ok");
        } else if (data?.status === "warning") {
          setStatus("warning");
        } else {
          setStatus("error");
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setStatus("offline");
      }
    };

    void checkHealth();

    return () => {
      controller.abort();
    };
  }, []);

  const statusLabel = {
    error: "Degraded performance",
    offline: "API offline",
    ok: "All systems normal",
    warning: "Partial outage",
  }[status];

  return (
    <a
      aria-label={`API Status: ${statusLabel}`}
      className="cursor-pointer focus-visible:outline-2 outline-(--ds-focus-color) shrink flex flex-row min-w-0 contain-content outline-none focus-visible:shadow-(--ds-focus-ring)"
      href={`${env.NEXT_PUBLIC_API_URL}/health`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex-[0_1_auto] min-w-0 w-auto h-[34px] max-[960px]:h-8 flex items-center px-3 border border-gray-alpha-400 gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-200 ease-[ease] *:leading-(--geist-form-line-height) border-none! rounded-md bg-transparent! hover:bg-gray-300!">
        <span
          className={cn(
            "status-dot shrink-0 inline-block size-2.5 rounded-full transition-[background-color,box-shadow] duration-300",
            status === "ok" &&
              "bg-geist-success shadow-[0_0_8px_color-mix(in_srgb,var(--geist-success)_50%,transparent)]",
            status === "warning" &&
              "bg-geist-warning shadow-[0_0_8px_color-mix(in_srgb,var(--geist-warning)_50%,transparent)]",
            (status === "error" || status === "offline") &&
              "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]"
          )}
        />
        <p
          className={cn(
            "status-text text-copy-14 geist-ellipsis font-mono font-medium uppercase text-[12px] transition-colors duration-300",
            status === "ok" && "text-geist-success",
            status === "warning" && "text-geist-warning",
            (status === "error" || status === "offline") && "text-geist-error"
          )}
        >
          {statusLabel}.
        </p>
      </div>
    </a>
  );
};
