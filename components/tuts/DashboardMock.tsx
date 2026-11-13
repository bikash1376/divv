import {
  Analytics01Icon,
  Crown02Icon,
  DashboardSquare01Icon,
  Folder01Icon,
  Home01Icon,
  Invoice01Icon,
  Notification01Icon,
  Search01Icon,
  Settings01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const NAV = [
  { label: "Home", icon: Home01Icon, active: true },
  { label: "Projects", icon: Folder01Icon },
  { label: "Analytics", icon: Analytics01Icon },
  { label: "Team", icon: UserGroupIcon },
  { label: "Billing", icon: Invoice01Icon },
  { label: "Settings", icon: Settings01Icon },
];

const USAGE = [
  { label: "Animations uploaded", value: 92, color: "#E5484D" },
  { label: "Community animations imported", value: 38, color: "#019D91" },
  { label: "Design files uploaded", value: 12, color: "#019D91" },
];

const STATS = [
  { label: "Views this week", value: "24,812", delta: "+12.4%" },
  { label: "Active members", value: "18", delta: "+2" },
  { label: "Files", value: "342", delta: "+27" },
];

const BARS = [38, 52, 44, 70, 61, 84, 58, 76, 90, 66, 72, 95];

const FILES = [
  { name: "Onboarding flow v3", owner: "Design", updated: "2h ago" },
  { name: "Checkout loader", owner: "Growth", updated: "Yesterday" },
  { name: "Empty states pack", owner: "Design", updated: "3 days ago" },
  { name: "Marketing hero loop", owner: "Brand", updated: "Last week" },
];

/** Static, non-interactive app chrome that sits behind the tour overlay. */
export default function DashboardMock() {
  return (
    <div className="flex h-full w-full bg-[#F5F6F7] font-sans text-[#20272C]" aria-hidden>
      <aside className="hidden w-[260px] shrink-0 flex-col gap-6 border-r border-[#E3E6E8] bg-white p-4 md:flex">
        <div className="flex items-center gap-2 rounded-lg border border-[#E3E6E8] p-2">
          <div className="grid size-8 place-items-center rounded-md bg-[#019D91] text-sm font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Acme Studio</div>
            <div className="text-xs text-[#6B747C]">Free plan · 4 members</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                item.active ? "bg-[#E8F6F5] font-medium text-[#01786F]" : "text-[#4A535A]"
              }`}
            >
              <HugeiconsIcon icon={item.icon} size={18} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-4">
          {USAGE.map((u) => (
            <div key={u.label} className="flex flex-col gap-1.5">
              <span className="text-xs text-[#4A535A]">{u.label}</span>
              <div className="h-1.5 rounded-full bg-[#E3E6E8]">
                <div className="h-full rounded-full" style={{ width: `${u.value}%`, background: u.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-[#019D91] py-2.5 text-sm font-semibold text-white">
            <HugeiconsIcon icon={Crown02Icon} size={18} />
            Upgrade
          </div>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-[#D5DADD] py-2.5 text-sm font-medium">
            <HugeiconsIcon icon={UserAdd01Icon} size={18} />
            Invite members
          </div>
        </div>

        <div className="mt-auto rounded-lg border border-[#E3E6E8] p-3">
          <div className="text-sm font-semibold">Unlock more with premium</div>
          <p className="mt-1 text-xs leading-relaxed text-[#6B747C]">
            Optimize your animation file size for better page load speed & performance.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[#E3E6E8] bg-white px-6">
          <HugeiconsIcon icon={DashboardSquare01Icon} size={20} className="text-[#6B747C]" />
          <span className="font-semibold">Dashboard</span>
          <div className="ml-auto hidden w-72 items-center gap-2 rounded-md border border-[#E3E6E8] px-3 py-1.5 text-sm text-[#9AA3AA] sm:flex">
            <HugeiconsIcon icon={Search01Icon} size={16} />
            Search files, people…
          </div>
          <HugeiconsIcon icon={Notification01Icon} size={20} className="text-[#6B747C] max-sm:ml-auto" />
          <div className="size-8 rounded-full bg-gradient-to-br from-[#FFB224] to-[#E5484D]" />
        </header>

        <main className="flex flex-1 flex-col gap-6 overflow-hidden p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-[#E3E6E8] bg-white p-4">
                <div className="text-xs text-[#6B747C]">{s.label}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">{s.value}</span>
                  <span className="text-xs font-medium text-[#019D91]">{s.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#E3E6E8] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Plays over time</span>
              <span className="text-xs text-[#6B747C]">Last 12 weeks</span>
            </div>
            <div className="mt-4 flex h-40 items-end gap-2">
              {BARS.map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#019D91]/80" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E6E8] bg-white">
            <div className="border-b border-[#E3E6E8] px-4 py-3 text-sm font-semibold">Recent files</div>
            {FILES.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between border-b border-[#F0F2F3] px-4 py-3 text-sm last:border-0"
              >
                <span className="font-medium">{f.name}</span>
                <span className="hidden text-[#6B747C] sm:inline">{f.owner}</span>
                <span className="text-[#6B747C]">{f.updated}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
