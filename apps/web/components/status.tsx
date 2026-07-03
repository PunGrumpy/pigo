"use client";

import { useEffect, useState } from "react";

import { env } from "@/env";
import { cn } from "@/lib/utils";

type StatusType = "ok" | "warning" | "error" | "offline";

export const Status = () => {
  const [status, setStatus] = useState<StatusType>("offline");

  useEffect(() => {
    const controller = new AbortController();

    const checkHealth = async (): Promise<void> => {
      try {
        const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/health`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as { status?: string };
          if (data?.status === "ok") {
            setStatus("ok");
          } else if (data?.status === "warning") {
            setStatus("warning");
          } else {
            setStatus("error");
          }
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

  let statusColor =
    "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]";
  let statusLabel = "API offline";
  let textColor = "text-geist-error";

  if (status === "ok") {
    statusColor =
      "bg-geist-success shadow-[0_0_8px_color-mix(in_srgb,var(--geist-success)_50%,transparent)]";
    statusLabel = "All systems normal";
    textColor = "text-geist-success";
  } else if (status === "warning") {
    statusColor =
      "bg-geist-warning shadow-[0_0_8px_color-mix(in_srgb,var(--geist-warning)_50%,transparent)]";
    statusLabel = "Partial outage";
    textColor = "text-geist-warning";
  } else if (status === "error") {
    statusColor =
      "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]";
    statusLabel = "Degraded performance";
    textColor = "text-geist-error";
  }

  return (
    <a
      aria-label={`API Status: ${statusLabel}`}
      className="cursor-pointer focus-visible:outline-2 outline-(--ds-focus-color) shrink flex flex-row min-w-0 contain-content outline-none focus-visible:shadow-(--ds-focus-ring)"
      href={`${env.NEXT_PUBLIC_API_URL}/health`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex-[0_1_auto] min-w-0 w-auto h-[34px] max-[960px]:h-8 flex items-center px-3 border border-gray-alpha-400 gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 ease-[ease] *:leading-(--geist-form-line-height) border-none! rounded-md bg-transparent! hover:bg-gray-300!">
        <span
          className={cn(
            "status-dot shrink-0 inline-block size-2.5 rounded-full transition-all duration-300",
            statusColor
          )}
        />
        <p
          className={cn(
            "status-text text-copy-14 geist-ellipsis font-mono font-medium uppercase text-[12px] transition-all duration-300",
            textColor
          )}
        >
          {statusLabel}.
        </p>
      </div>
    </a>
  );
};
