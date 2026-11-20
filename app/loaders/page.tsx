"use client"
import { useRouter } from "next/navigation";
import { useState } from "react";
import PanPlayground from "@/components/PanPlayground";

// The pan / kitchen loaders playground on its own URL. It used to open only from
// the Stuff shelf card; here it's open from the start, and closing it goes home.
export default function LoadersPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(true);

  return (
    <div className="min-h-svh bg-[#FBFBFB]">
      <PanPlayground
        open={open}
        onClose={() => setOpen(false)}
        origin={null}
        onExitComplete={() => router.push("/")}
        playing={playing}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    </div>
  );
}
