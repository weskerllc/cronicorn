import type React from "react";

interface FormFieldRowProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * FormFieldRow - Layout for horizontal form field arrangements
 * 
 * Used for side-by-side form fields with aligned bottoms (items-end).
 * Common pattern in forms with multiple input fields in a row.
 * 
 * @example
 * ```tsx
 * <FormFieldRow>
 *   <FormField name="key">
 *     <FormItem className="flex-1">
 *       <FormLabel>Key</FormLabel>
 *       <FormControl><Input /></FormControl>
 *     </FormItem>
 *   </FormField>
 *   <FormField name="value">
 *     <FormItem className="flex-1">
 *       <FormLabel>Value</FormLabel>
 *       <FormControl><Input /></FormControl>
 *     </FormItem>
 *   </FormField>
 * </FormFieldRow>
 * ```
 */
export function FormFieldRow({ children, className = "" }: FormFieldRowProps) {
    return (
        <div className={`flex gap-2 items-end ${className}`}>
            {children}
        </div>
    );
}
