import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";
import { cn } from "@cronicorn/ui-library/lib/utils";

interface CodeBlockProps {
  code: string;
  /**
   * Language for syntax highlighting (future enhancement)
   */
  language?: string;
  /**
   * Whether to show a copy button
   */
  copyable?: boolean;
  className?: string;
}

export function CodeBlock({ 
  code, 
  language: _language = "text", // Reserved for future syntax highlighting
  copyable = true,
  className 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative", className)}>
      <pre className="bg-muted border rounded-md p-4 overflow-x-auto text-sm">
        <code className="text-foreground">{code}</code>
      </pre>
      {copyable && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy
            </>
          )}
        </Button>
      )}
    </div>
  );
}
