
export function PageHeader({text, description, slotRight}: {
    text: string;
    description?: string;
    slotRight?: React.ReactNode;
}) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
   <div>
<h1 className="text-2xl font-semibold">{text}</h1>
        <p className="text-muted-foreground">
          {description}
        </p>
   </div>
   {slotRight}
        </div>
  )
}
