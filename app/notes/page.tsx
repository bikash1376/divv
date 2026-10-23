"use client"
import React, { useState } from "react"
import {
  BookMarkedIcon,
  Chat01Icon,
  StarAward01Icon,
  FeatherIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const tabs = [BookMarkedIcon, Chat01Icon, StarAward01Icon]

const NotesPage = () => {
  const [active, setActive] = useState(0)

  return (
    <div className="h-screen bg-white flex justify-center items-center">
      {/* Card: big radius + outer drop shadow + inset highlight/shade */}
      <div
        className="relative h-104 w-96 overflow-hidden rounded-[56px]
        bg-linear-to-b from-gray-100 to-gray-50 border border-white/80
        shadow-[0_24px_50px_-12px_rgba(0,0,0,0.18),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-3px_8px_rgba(0,0,0,0.04)]"
      >
        {/* Text with focus effect */}
        <div className="px-8 pt-10 space-y-6 text-[17px] leading-relaxed font-medium">
          <p className="text-gray-500 opacity-50 blur-[3px]">
            the stories were anything more than something to scare children
            home before dark.
          </p>

          <p className="text-gray-900">
            even though no one else was there. The flame inside glowed blue.
            Not sky blue or river blue, but a strange soft blue that looked
            like it could hum if it wanted to.
          </p>

          <p className="text-gray-400 opacity-60 blur-[0.5px]">
            Tunde picked it up. The moment his fingers touched the metal
            handle, the ground under him trembled.
          </p>
        </div>

        {/* Bottom fade so text dissolves under the nav */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-gray-50 via-gray-50/90 to-transparent" />

        {/* Floating nav */}
        <div className="absolute bottom-5 inset-x-5 flex items-center justify-between">
          {/* Tab pill */}
          <div
            className="flex items-center rounded-full p-1 bg-white/60 backdrop-blur-md
            border border-[#EDEDED]
            shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]"
          >
            {tabs.map((icon, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`rounded-full px-7 py-4 transition-all active:scale-95 ${
                  active === i
                    ? "bg-linear-to-b from-gray-200 to-gray-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),inset_0_-1px_0_rgba(255,255,255,0.6)]"
                    : ""
                }`}
              >
                <HugeiconsIcon
                  icon={icon}
                  size={24}
                  strokeWidth={1.5}
                  color="black"
                />
              </button>
            ))}
          </div>

          {/* Circle button */}
          <button
            className="grid place-items-center size-14 rounded-full
            bg-linear-to-b from-white to-gray-100 border border-[#EDEDED]
            shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.9)]
            active:scale-95 transition-all"
          >
            <HugeiconsIcon
              icon={FeatherIcon}
              size={22}
              strokeWidth={1.5}
              color="black"
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotesPage