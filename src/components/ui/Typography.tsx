import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const typography = cva(['font-[var(--font-bell)]', 'font-bell'], {
  variants: {
    size: {
      xl: 'text-6xl leading-[4rem]', // 64px / 64px
      h1: 'text-5xl leading-[3.625rem]', // 48px / 58px
      h2: 'text-[42px] leading-[3.125rem]', // 42px / 50px
      h3: 'text-4xl leading-[2.75rem]', // 36px / 44px
      h4: 'text-[32px] leading-10', // 32px / 40px
      h5: 'text-[28px] leading-9', // 28px / 36px
      h6: 'text-2xl leading-8', // 24px / 32px
      bodyXXL: 'text-[22px] leading-[1.625rem]', // 22px / 26px
      bodyXL: 'text-xl leading-6', // 20px / 24px
      bodyL: 'text-lg leading-[1.375rem]', // 18px / 22px
      body: 'text-base leading-5', // 16px / 20px
      bodyS: 'text-sm leading-[1.125rem]', // 14px / 18px
      bodyXS: 'text-xs leading-4', // 12px / 16px
      bodyXXS: 'text-[10px] leading-[0.875rem]', // 10px / 14px
    },
    weight: {
      regular: 'font-normal', // 400
      medium: 'font-medium', // 500
      semibold: 'font-semibold', // 600
      bold: 'font-bold', // 700
    },
    color: {
      // Default colors
      inherit: 'text-inherit',
      current: 'text-current',
      transparent: 'text-transparent',

      // Black and White
      black: 'text-black',
      white: 'text-white',

      warningFocus: 'text-[var(--color-warning-focus)]',
      warningPressed: 'text-[var(--color-warning-pressed)]',
      warningHover: 'text-[var(--color-warning--hover)]',
      warningBorder: 'text-[var(--color-warning-border)]',
      warningSecondary: 'text-[var(--color-warning-secondary)]',
      warningMain: 'text-[var(--color-warning-main)]',
      infoMain: 'text-[var(--color-info-main)]',
      infoSecondary: 'text-[var(--color-info-secondary)]',
      infoBorder: 'text-[var(--color-info-border)]',
      infoHover: 'text-[var(--color-info-hover)]',
      infoPressed: 'text-[var(--color-info-pressed)]',
      infoFocus: 'text-[var(--color-info-focus)]',
      successMain: 'text-[var(--color-success-main)]',
      successSecondary: 'text-[var(--color-success-secondary)]',
      successBorder: 'text-[var(--color-success-border)]',
      successHover: 'text-[var(--color-success-hover)]',
      successPressed: 'text-[var(--color-success-pressed)]',
      successFocus: 'text-[var(--color-success-focus)]',
      dangerMain: 'text-[var(--color-danger-main)]',
      dangerSecondary: 'text-[var(--color-danger-secondary)]',
      dangerBorder: 'text-[var(--color-danger-border)]',
      dangerHover: 'text-[var(--color-danger-hover)]',
      dangerPressed: 'text-[var(--color-danger-pressed)]',
      dangerFocus: 'text-[var(--color-danger-focus)]',
      primaryMain: 'text-[var(--color-primary-main)]',
      primarySecondary: 'text-[var(--color-primary-secondary)]',
      primaryBorder: 'text-[var(--color-primary-border)]',
      primaryPressed: 'text-[var(--color-primary-pressed)]',
      primaryHover: 'text-[var(--color-primary-hover)]',
      primaryFocus: 'text-[var(--color-primary-focus)]',
    },
  },
  defaultVariants: {
    size: 'body',
    weight: 'regular',
    color: 'primaryMain',
  },
})

export interface TypographyProps
  extends VariantProps<typeof typography>,
    Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  as?:
    | 'p'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'span'
    | 'div'
    | 'label'
    | 'strong'
    | 'em'
  children: React.ReactNode
  className?: string
  htmlFor?: string // For label elements
  id?: string // For any element
}

export const Typography: React.FC<TypographyProps> = ({
  as: Component = 'p',
  size,
  weight,
  color = 'primaryMain',
  className,
  children,
  ...props
}) => {
  return (
    <Component
      className={clsx(typography({ size, weight, color }), className)}
      {...props}
    >
      {children}
    </Component>
  )
}
