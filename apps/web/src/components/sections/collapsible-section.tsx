import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import { cn } from "@cronicorn/ui-library/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  /**
   * Whether the section is open by default
   */
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  className 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-md", className)}>
      <Button
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <ChevronDown 
          className={cn(
            "size-4 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </Button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t">
          {children}
        </div>
      )}
    </div>
  );
}
