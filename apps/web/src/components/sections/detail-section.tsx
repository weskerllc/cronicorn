import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@cronicorn/ui-library/components/card";

interface DetailSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Actions to display in the card header (typically buttons)
   */
  headerActions?: React.ReactNode;
}

export function DetailSection({ 
  title, 
  description, 
  children,
  className,
  headerActions
}: DetailSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerActions && <div className="flex gap-2">{headerActions}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}
