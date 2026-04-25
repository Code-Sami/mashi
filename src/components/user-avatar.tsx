"use client";

import { useMemo, useState } from "react";
import { getInitials } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  sizeClassName = "h-12 w-12",
  textClassName = "text-sm",
  className = "",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedUrl = (avatarUrl || "").trim();
  const showImage = normalizedUrl.length > 0 && !imageFailed;
  const initials = useMemo(() => getInitials(name || "Member"), [name]);

  return (
    <div
      className={`overflow-hidden rounded-full bg-brand/10 text-brand-dark ${sizeClassName} ${className}`.trim()}
      aria-label={`${name} avatar`}
    >
      {showImage ? (
        <img
          src={normalizedUrl}
          alt={`${name} avatar`}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center font-bold ${textClassName}`.trim()}>
          {initials}
        </div>
      )}
    </div>
  );
}
