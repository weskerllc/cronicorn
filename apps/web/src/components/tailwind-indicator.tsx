export function TailwindIndicator() {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center justify-center rounded-full bg-background px-3 py-2 font-mono text-xs text-foreground shadow-lg">
      <div className="block sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
}
