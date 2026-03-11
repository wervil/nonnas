import { clsx } from 'clsx'
import { InputHTMLAttributes } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Typography } from './Typography'

interface InputProps<T extends FieldValues>
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  name: Path<T>
  control: Control<T>
  error?: string
  maxLength?: number
  hideLabel?: boolean
  hideCharacterCount?: boolean
  containerClassName?: string
}

const Input = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  description,
  maxLength,
  hideLabel = false,
  hideCharacterCount = false,
  containerClassName = '',
  ...props
}: InputProps<T> & { description?: string }) => {
  return (
    <div className={containerClassName}>
      {!hideLabel && (
        <Typography
          as="label"
          htmlFor={name}
          color="black"
          className="mb-2"
        >
          {label}
        </Typography>
      )}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const charCount = (field.value as string)?.length || 0

          return (
            <div className="flex flex-col">
              <input
                {...field}
                {...props}
                id={name}
                maxLength={maxLength}
                className={clsx(
                  'h-11.25 sm:h-12.25 w-full rounded-[inherit] px-3 sm:px-4 py-2 sm:py-3 items-center font-normal leading-normal text-[13px] sm:text-[14px] text-[#2D2D2D80]! tracking-[-0.1504px] bg-white border-none outline-none',
                  fieldState.error ? 'border-red-500 focus:border-red-500' : '',
                  className
                )}
              />
              {maxLength && !hideCharacterCount && (
                <Typography size="bodyXS" color="black" className="mt-2">
                  {charCount}/{maxLength} Characters
                </Typography>
              )}
              {(fieldState.error || error) && (
                <Typography size="bodyXS" color="dangerMain" className="mt-2">
                  {error || fieldState.error?.message}
                </Typography>
              )}
            </div>
          )
        }}
      />
      {description && (
        <Typography size="bodyXS" color="primaryFocus" className="mt-2">
          {description}
        </Typography>
      )}
    </div>
  )
}

export default Input
