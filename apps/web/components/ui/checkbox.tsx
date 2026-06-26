import { useId } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label: string;
}

export const Checkbox = ({
  checked,
  className,
  disabled,
  id,
  label,
  onChange,
  ...props
}: CheckboxProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("flex flex-row items-start gap-3", className)}>
      <label
        className="inline-flex cursor-pointer items-center text-[13px]"
        htmlFor={inputId}
      >
        <span className="-m-0.5 relative flex items-center p-0.5">
          <input
            checked={checked}
            className="peer sr-only"
            disabled={disabled}
            id={inputId}
            type="checkbox"
            onChange={onChange}
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              "relative inline-flex size-4 rotate-[0.000001deg] items-center justify-center rounded-sm border border-gray-700 bg-background-100 transition-all duration-200",
              "[--checkbox-color:var(--ds-gray-700)]",
              "peer-checked:bg-gray-1000 peer-checked:border-gray-1000",
              "peer-disabled:peer-checked:border-gray-600 peer-disabled:peer-checked:bg-gray-600",
              "peer-disabled:not-peer-checked:border-gray-500 peer-disabled:not-peer-checked:bg-gray-100",
              "peer-hover:not-peer-disabled:not-peer-checked:bg-gray-200",
              "peer-focus-visible:shadow-[0_0_0_1px_var(--ds-gray-600),0_0_0_3px_color-mix(in_oklch,var(--ds-gray-600)_50%,transparent)]",
              "peer-focus-visible:not-peer-checked:not-peer-disabled:bg-gray-200",
              "[&_svg_path]:invisible peer-checked:[&_svg_path]:visible"
            )}
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="16"
              viewBox="0 0 20 20"
              width="16"
            >
              <path
                className="stroke-background-100"
                d="M14 7L8.5 12.5L6 10"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
        </span>
        <span className="ml-2">
          <span className="text-label-14 text-gray-1000">{label}</span>
        </span>
      </label>
    </div>
  );
};
