import { Upload, Camera, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocStatusTag } from "@/components/ui/status";
import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function UploadCard({
  name,
  requirement,
  status,
  pages,
  size,
  className,
}: {
  name: string;
  requirement: string;
  status: DocumentStatus;
  pages?: number;
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface-1 p-4 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-navy-900">{name}</p>
          <p className="mt-1 text-xs text-text-muted">{requirement}</p>
          {(pages || size) && (
            <p className="mt-1 text-xs text-text-secondary">
              {pages ? `${pages} 頁` : ""}
              {pages && size ? " · " : ""}
              {size ?? ""}
            </p>
          )}
        </div>
        <DocStatusTag status={status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          <Upload className="size-3.5" />
          檔案
        </Button>
        <Button size="sm" variant="outline">
          <Camera className="size-3.5" />
          拍照
        </Button>
        <Button size="sm" variant="ghost">
          <ImageIcon className="size-3.5" />
          相簿
        </Button>
      </div>
    </div>
  );
}
