'use client';

export function ExperimentCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/50">
      <div className="h-[500px] md:h-[600px] w-full">
        {children}
      </div>
      <div className="p-4 border-t border-white/10">
        <h2 className="text-lg font-semibold text-white mb-1">{title}</h2>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}
