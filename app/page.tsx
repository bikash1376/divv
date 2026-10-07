"use client"

import Container from "@/components/Container";
import Motion from "@/components/Motion";
import Image from "next/image";
import Link from "next/link";
import {motion, useMotionValue, useTransform} from 'motion/react'

const boxes = Array.from({length:6}, (_, index) => index+1);

export default function Home() {

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const backgroundColor = useTransform(x, [-100, 100], ["#ff0000", "#00ff00"])

  return (
  <div className="min-h-screen flex justify-center items-center">
    {/* <Container> */}
   
    {/* <div className="flex items-center h-60"> */}
      {/* <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Hello, there</h1> */}
    {/* </div> */}
    {/* <motion.div className="w-40 h-40 bg-white rounded-lg" drag dragConstraints={{
      left:-200,
      right:200,
      top:-200,
      bottom:200
    }}
    style={{x, y, backgroundColor}}
    ></motion.div> */}



<div className="space-y-6 mt-[40em]">
  {boxes.map((box) => (
      <motion.div key={box} className="w-50 h-50 bg-yellow-300 rounded-lg" drag initial={{
        opacity:0,  scale:0.7
      }}
      whileInView={{ opacity:1, scale:1}}
      transition={{duration:0.2, ease:'easeInOut'}}
      ></motion.div>
  ))}
</div>

    {/* <Motion/> */}
     {/* </Container> */}
     {/* <motion.div className="w-30 h-30 bg-amber-400 rounded-2xl cursor-grab overflow-hidden" drag dragConstraints={{left:-1150, right:-50, top:0, bottom:400}} ></motion.div> */}
     </div>
  );
}
