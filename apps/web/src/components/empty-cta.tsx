import { Button } from "@cronicorn/ui-library/components/button"
import { Link } from "@tanstack/react-router"

export function EmptyCTA({ title, description, button }: {
    title: string;
    description: string;
    button?: {
        text: string;
        icon: React.ReactNode;
        link: string;
    }

}) {
    return (
        <div className="border rounded-lg p-8 sm:p-12 text-center bg-muted/50">
            <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">
                    {description}
                </p>
                {button && (
                    <Button asChild>
                        <Link to={button.link}>
                            {button.icon}
                            {button.text}
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    )
}
