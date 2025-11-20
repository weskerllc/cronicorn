"use client";

import { cn } from "@cronicorn/ui-library/lib/utils";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

type ScrollAreaProps = React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  hideScrollbars?: boolean;
};

function ScrollArea({
  className,
  children,
  hideScrollbars,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        data-hide-scrollbars={hideScrollbars ? "true" : undefined}
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {!hideScrollbars && (
        <>
          <ScrollBar />
          <ScrollBar orientation="horizontal" />
        </>
      )}
      <ScrollAreaPrimitive.Corner />
      {hideScrollbars ? (
        <style>{`
          /* Hide native scrollbars within this ScrollArea when requested */
          [data-slot="scroll-area-viewport"][data-hide-scrollbars="true"] {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE 10+ */
          }
          [data-slot="scroll-area-viewport"][data-hide-scrollbars="true"]::-webkit-scrollbar {
            display: none; /* Safari and Chrome */
            width: 0;
            height: 0;
          }
        `}</style>
      ) : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical"
        && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal"
        && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      forceMount
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
