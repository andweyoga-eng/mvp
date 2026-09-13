import { Headphones, MessageCircle, Phone, X } from "lucide-react";
import { CUSTOMER_SUPPORT } from "@shared/support";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TeamContactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamContactSheet({ open, onOpenChange }: TeamContactSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[24px] px-5 pb-8 pt-6">
        <SheetHeader className="mb-5 text-left">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </span>
            <div>
              <SheetTitle className="font-display text-lg">Talk to our team</SheetTitle>
              <SheetDescription>Questions about this session? We&apos;re here.</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-2.5">
          <a
            href={CUSTOMER_SUPPORT.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-[rgba(37,211,102,0.2)] bg-white p-3.5 transition-colors hover:bg-[rgba(37,211,102,0.06)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">WhatsApp</span>
              <span className="block text-xs text-muted-foreground">
                {CUSTOMER_SUPPORT.phoneDisplay} · Usually replies in minutes
              </span>
            </span>
          </a>

          <a
            href={CUSTOMER_SUPPORT.telHref}
            className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white p-3.5 transition-colors hover:bg-primary/[0.04]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Call us</span>
              <span className="block text-xs text-muted-foreground">
                {CUSTOMER_SUPPORT.phoneDisplay} · {CUSTOMER_SUPPORT.hoursShort}
              </span>
            </span>
          </a>

          <a
            href={CUSTOMER_SUPPORT.smsHref}
            className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white p-3.5 transition-colors hover:bg-primary/[0.04]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-dz-secondary/10 text-dz-secondary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Send a message</span>
              <span className="block text-xs text-muted-foreground">
                SMS {CUSTOMER_SUPPORT.phoneDisplay} · We&apos;ll reply within a few hours
              </span>
            </span>
          </a>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="mt-5 w-full text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          <X className="mr-2 h-4 w-4" />
          Not now
        </Button>
      </SheetContent>
    </Sheet>
  );
}
