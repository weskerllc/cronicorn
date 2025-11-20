import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@cronicorn/ui-library/components/button";

/**
 * Props for the CodeDisplay component
 */
export interface CodeDisplayProps {
    /**
     * Code content to display
     */
    code: string;
    /**
     * Programming language for syntax highlighting (optional)
     */
    language?: string;
    /**
     * Maximum height before scrolling
     */
    maxHeight?: string;
    /**
     * Show line numbers
     */
    showLineNumbers?: boolean;
    /**
     * Enable copy button
     */
    enableCopy?: boolean;
    /**
     * Additional CSS classes for the container
     */
    className?: string;
}

/**
 * CodeDisplay component for displaying code snippets with optional copy functionality
 *
 * @example
 * ```tsx
 * <CodeDisplay
 *   code={responseBody}
 *   language="json"
 *   maxHeight="300px"
 *   enableCopy
 * />
 * ```
 */
export function CodeDisplay({
    code,
    language: _language,
    maxHeight = "400px",
    showLineNumbers = false,
    enableCopy = true,
    className,
}: CodeDisplayProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const lines = showLineNumbers ? code.split("\n") : null;

    return (
        <div className={`relative rounded-lg border bg-muted/50 ${className || ""}`}>
            {enableCopy && (
                <div className="absolute right-2 top-2 z-10">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopy}
                        className="h-8 w-8 p-0"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            )}
            <pre
                className={`overflow-auto p-4 text-sm ${enableCopy ? "pr-12" : ""}`}
                style={{ maxHeight }}
            >
                {showLineNumbers && lines ? (
                    <code className="grid grid-cols-[auto_1fr] gap-x-4">
                        <span className="select-none text-muted-foreground">
                            {lines.map((_, i) => (
                                <div key={i}>{i + 1}</div>
                            ))}
                        </span>
                        <span>
                            {lines.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                        </span>
                    </code>
                ) : (
                    <code className="block break-all whitespace-pre-wrap">{code}</code>
                )}
            </pre>
        </div>
    );
}
