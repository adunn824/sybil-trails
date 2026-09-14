"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/time";

// Shows "updated 12 min ago" and quietly refreshes the page every minute
// so a phone left open on the sign stays current.
export default function Updated({ iso, by }: { iso: string; by?: string }) {
  const router = useRouter();
  const [label, setLabel] = useState(() => relativeTime(iso));
  useEffect(() => {
    setLabel(relativeTime(iso));
    const tick = setInterval(() => setLabel(relativeTime(iso)), 30_000);
    const refresh = setInterval(() => router.refresh(), 60_000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [iso, router]);
  const exact = new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
  return (
    <div className="hero__updated" title={exact}>
      Updated {label}
      {by ? ` by ${by}` : ""}
    </div>
  );
}
