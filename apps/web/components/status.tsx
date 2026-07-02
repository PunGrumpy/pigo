import "server-only";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export const Status = async () => {
  let statusColor =
    "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]";
  let statusLabel = "API offline";
  let textColor = "text-geist-error";

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/health`, {
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as { status?: string };
      if (data?.status === "ok") {
        statusColor =
          "bg-geist-success shadow-[0_0_8px_color-mix(in_srgb,var(--geist-success)_50%,transparent)]";
        statusLabel = "All systems normal";
        textColor = "text-geist-success";
      } else if (data?.status === "warning") {
        statusColor =
          "bg-geist-warning shadow-[0_0_8px_color-mix(in_srgb,var(--geist-warning)_50%,transparent)]";
        statusLabel = "Partial outage";
        textColor = "text-geist-warning";
      } else {
        statusColor =
          "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]";
        statusLabel = "Degraded performance";
        textColor = "text-geist-error";
      }
    } else {
      statusColor =
        "bg-geist-error shadow-[0_0_8px_color-mix(in_srgb,var(--geist-error)_50%,transparent)]";
      statusLabel = "Degraded performance";
      textColor = "text-geist-error";
    }
  } catch {
    // Fallback stays as offline status
  }

  return (
    <a
      aria-label={`API Status: ${statusLabel}`}
      className="cursor-pointer focus-visible:outline-2 outline-(--ds-focus-color) shrink w-full min-w-0 contain-content outline-none focus-visible:shadow-(--ds-focus-ring)"
      href={`${env.NEXT_PUBLIC_API_URL}/health`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex-[0_1_auto] min-w-0 w-auto h-[34px] max-[960px]:h-8 flex items-center px-3 border border-gray-alpha-400 gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 [transition-timing-function:ease] [&>*]:leading-[var(--geist-form-line-height)] border-none! rounded-md bg-transparent! hover:bg-gray-100! dark:hover:bg-gray-900/50!">
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
