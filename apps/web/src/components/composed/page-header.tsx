export function PageHeader({
  text,
  description,
  slotRight,
}: {
  text: string;
  description?: string;
  slotRight?: React.ReactNode;
}) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold truncate">{text}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {slotRight}
    </div>
  );
}
