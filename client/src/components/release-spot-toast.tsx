import { CheckCircle2 } from "lucide-react";

export function ReleaseSpotToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-8 left-1/2 z-[400] flex -translate-x-1/2 animate-[toastIn_0.35s_cubic-bezier(.4,0,.2,1)_forwards] items-center gap-2.5 whitespace-nowrap rounded-2xl px-[22px] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_32px_rgba(27,28,27,0.24)]"
      style={{ background: "#314736" }}
      role="status"
    >
      <CheckCircle2 className="h-[22px] w-[22px] text-[#cfe9d1]" fill="currentColor" />
      Your spot has been released.
    </div>
  );
}
