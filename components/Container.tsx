import { cn } from '@/lib/utils'
import React from 'react'


const Container = ({
    children,
    className
}: {
    children: React.ReactNode,
    className?: string
}) => {
  return (
    <div className={cn('max-w-4xl mx-auto p-4 md:p-10', className)}>
      {children}
    </div>
  )
}

export default Container
