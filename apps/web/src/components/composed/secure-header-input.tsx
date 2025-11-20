import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@cronicorn/ui-library/components/button";
import { Input } from "@cronicorn/ui-library/components/input";

interface SecureHeaderInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  headerName?: string;
}

/**
 * Checks if a header name is sensitive and should be masked by default.
 */
function isSensitiveHeader(headerName: string): boolean {
  const sensitivePatterns = [
    /^authorization$/i,
    /^api-?key$/i,
    /^x-api-?key$/i,
    /^bearer$/i,
    /^token$/i,
    /^secret$/i,
    /^password$/i,
    /^auth$/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(headerName));
}

/**
 * Input component for header values with show/hide toggle for sensitive data.
 * Automatically masks values for headers like Authorization, API-Key, etc.
 */
export function SecureHeaderInput({
  value,
  onChange,
  placeholder = "Header value",
  disabled = false,
  headerName = "",
}: SecureHeaderInputProps) {
  const shouldMask = headerName && isSensitiveHeader(headerName);
  const [isVisible, setIsVisible] = useState(!shouldMask);

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      {shouldMask && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setIsVisible(!isVisible)}
          disabled={disabled}
          tabIndex={-1}
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="sr-only">
            {isVisible ? "Hide" : "Show"} header value
          </span>
        </Button>
      )}
    </div>
  );
}
