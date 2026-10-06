"use client";
import { motion } from "motion/react";
import Image from "next/image";

export default function Motion() {
  const MotionImage = motion.create(Image);

  const boxVariants = {
    initial: {
      scale:1, rotate: 0, skew: 0
    },
    hover: {
      scale:1.2, rotate:-15, skew: "10deg"
    },
    tap: {
      scale:0.9, rotate:15, transition: {
        duration:0.3
      }
    }
  }
  return(
    <>
  <motion.button
     initial={{ scale: 0 }} animate={{ scale: 1, opacity:1 }}
    className="bg-white text-black px-4 py-2 rounded-md mr-10"
  >
    Hello
  </motion.button>
  {/* <motion.ul animate={{ rotate: 360 }} className="w-10 h-10 bg-amber-200"></motion.ul> */}
  {/* <motion.div animate={{scale:2, transition: {duration:2}}} className="w-20 h-20 bg-purple-300"></motion.div> */}
 {/* <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.95}} onHoverStart={() => console.log("hover started")}  className="bg-white text-black px-4 py-2 rounded-md">button</motion.button> */}
<br />
<br />
 {/* <motion.div className="w-40 h-40 bg-blue-500 rounded-lg" variants={boxVariants} initial="initial" whileHover="hover" whileTap="tap">

 </motion.div> */}

 {/* <motion.div className="w-40 h-40 bg-gray-50 rounded-lg" drag whileDrag={{scale:1.2, backgroundColor:"#FFA500", rotate:-5}} dragConstraints={{top:-10, left:-10, right:10, bottom:10}} transition={{type: "spring", stiffness:200}}>
 
 </motion.div> */}

  {/* <MotionImage  src="/vercel.svg" width={200} height={200} alt="vercel image" className="w-40 h-40 bg-blue-200 rounded-lg" drag whileDrag={{scale:1.2, backgroundColor:"#FFA500", rotate:-5}} dragConstraints={{top:-10, left:-10, right:10, bottom:10}} transition={{type: "spring", stiffness:200}}/> */}
  </>
  )
}
