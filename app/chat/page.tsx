"use client"
import React, { useState } from 'react'
import { ArrowRight02Icon, UnfoldLessIcon, ImagesIcon, AiDrawingIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from '@hugeicons/react';
import { motion, AnimatePresence } from 'motion/react'

const ChatPage = () => {
  const [clicked, setClicked] = useState(false)
  const [value, setValue] = useState("")

  function changeIcon() {
    setClicked((prev) => !prev)
  }

  const placeholderText = clicked ? "Ask Anything" : "Generate Image"

  return (
    <div className='text-white'>
      <div className='flex items-center gap-2 rounded-full bg-[#212324] p-1 w-fit'>

        {/* Icon toggle button */}
        <motion.div
          className='p-2 bg-[#1B1D1E] rounded-full flex items-center gap-1 cursor-pointer'
          onClick={changeIcon}
          whileTap={{ scale: 0.93 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={clicked ? "images" : "drawing"}
              initial={{ opacity: 1, filter: "blur(6px)", scale: 0.8 }}
              animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ opacity: 1, filter: "blur(6px)", scale: 0.8 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              style={{ display: "inline-flex" }}
            >
              {clicked ? (
                <HugeiconsIcon icon={ImagesIcon} size={20} strokeWidth={2} className='text-[#CFCBC5]' />
              ) : (
                <HugeiconsIcon icon={AiDrawingIcon} size={20} strokeWidth={2} className='text-[#CFCBC5]' />
              )}
            </motion.span>
          </AnimatePresence>

          <HugeiconsIcon icon={UnfoldLessIcon} size={12} strokeWidth={3} className='text-[#979188]' />
        </motion.div>

        {/* Input with animated fake placeholder */}
        <div className='relative'>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className='outline-none text-[#979188] w-32'
          />

          {value === "" && (
            <div className='pointer-events-none absolute inset-0 flex items-center text-[#979188] whitespace-nowrap'>
              <AnimatePresence initial={false}>
                <motion.span
                  key={clicked ? "ask" : "generate"}
                  className='absolute left-0 flex'
                >
                  {placeholderText.split("").map((char, i) => (
                    <motion.span
                      key={i}
                      style={{ display: "inline-block" }}
                      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{
                        opacity: 0,
                        y: -8,
                        filter: "blur(4px)",
                        transition: { delay: i * 0.02, duration: 0.15 },
                      }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Send button */}
        <div className='p-2 bg-[#1B1D1E] rounded-full active:scale-93 transition-all ease-in-out'>
          <HugeiconsIcon icon={ArrowRight02Icon} size={20} strokeWidth={2} className='text-[#CFCBC5]' />
        </div>
      </div>
    </div>
  )
}

export default ChatPage;