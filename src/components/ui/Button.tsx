import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const button = cva(
  [
    'flex items-center justify-center rounded-md',
    'text-xl leading-6 font-medium ',
    'transition-all duration-200 ease-in-out',
    'cursor-pointer',
    'disabled:cursor-not-allowed',
    'font-[var(--font-bell)]'
  ],
  {
    variants: {
      variant: {
        primary: ['bg-green-dark', 'text-primary-focus'],
        outline: ['border-1 border-primary-main', 'text-primary-main'],
        ghost: ['bg-transparent', 'text-primary-main', 'hover:bg-primary-light' ],
      },
      size: {
        shrink: ['px-1 py-0', 'text-sm!'],
        md: ['px-6 py-2'],
      },
    },
  }
)

export interface ButtonProps
  extends VariantProps<typeof button>,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {

  return (
    <button className={clsx(button({ variant, size }), className)} {...props}>
      {children}
    </button>
  )
}

export default Button
