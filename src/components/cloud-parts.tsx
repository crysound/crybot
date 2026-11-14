import type { HTMLAttributes, ReactNode } from "react";
import { ChevronLeft, Cloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { cloudColorFill } from "@/lib/cloud-look";

export const PRIMARY_WIDE = "ui-button ui-button-primary ui-button-pill ui-button-lg w-full";
export const LINK = "rounded-sm text-[13px] font-medium text-ink underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink disabled:opacity-50";
export const FIELD = "h-9 w-full rounded-[8px] border border-ink/15 bg-transparent px-3 text-[14px] text-ink outline-none transition-[border-color] duration-150 placeholder:text-ink-tertiary disabled:opacity-60 motion-reduce:transition-none";
const TAG = "inline-flex min-h-5 items-center gap-1 rounded-full bg-ink/[0.06] px-2 text-[12px] font-medium leading-4 text-ink-secondary";

export function Heading({ title, sub }: { title: string; sub?: ReactNode }) {
  return <div className="flex flex-col gap-1 pe-10">
    <h2 id="cloud-add-title" tabIndex={-1} className="text-[17px] font-medium leading-6 tracking-[-0.008em] text-ink outline-none! [text-wrap:balance]">{title}</h2>
    {sub && <p className="text-[14px] leading-5 text-ink-secondary [text-wrap:pretty]">{sub}</p>}
  </div>;
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}
    className="-ms-1.5 inline-flex items-center gap-0.5 self-start rounded-full py-1 pe-2.5 ps-1 text-[13px] leading-[18px] text-ink-secondary transition-colors hover:bg-ink/[0.06] hover:text-ink motion-reduce:transition-none">
    <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" className="rtl:-scale-x-100" />{label}
  </button>;
}

export function Tag({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cn(TAG, className)}>{children}</span>;
}

export function CloudTile({ color, size = 22 }: { color: unknown; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size, background: cloudColorFill(color) }}
    className="grid shrink-0 place-items-center rounded-[8px] text-white"><Cloud size={Math.round(size * 0.62)} strokeWidth={2.2} /></span>;
}

