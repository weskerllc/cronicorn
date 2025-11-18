import { Button } from "@cronicorn/ui-library/components/button";
import { Link } from "@tanstack/react-router";

interface EmptyCTAProps {
  title: string;
  description: string;
  button?: {
    text: string;
    icon: React.ReactNode;
    link: string;
  };
  action?: React.ReactNode;
}

export function EmptyCTA({ title, description, button, action }: EmptyCTAProps) {
  return (
    <div className="border rounded-md text-center bg-muted/50 p-8 sm:p-12">
      <div className="max-w-md mx-auto space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action || (button && (
          <Button asChild>
            <Link to={button.link}>
              {button.icon}
              {button.text}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
