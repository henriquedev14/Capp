import { SuprimentosSubNav } from "@/features/suprimentos/components/suprimentos-sub-nav";

export default function SuprimentosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <SuprimentosSubNav />
      {children}
    </div>
  );
}
