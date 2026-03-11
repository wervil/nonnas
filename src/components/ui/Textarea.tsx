import { clsx } from 'clsx'
import { InputHTMLAttributes } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Typography } from './Typography'

interface TextareaProps<T extends FieldValues>
  extends InputHTMLAttributes<HTMLTextAreaElement> {
  label: string
  description?: string
  name: Path<T>
  control: Control<T>
  theme?: 'dark' | 'light'
  error?: string
  maxLength?: number
}

const Textarea = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  description,
  theme = 'dark',
  maxLength,
  ...props
}: TextareaProps<T> & { description?: string }) => {
  return (
    <div className="w-full">
      <Typography
        as="label"
        htmlFor={name}
        color={theme === 'dark' ? "primaryFocus" : "black"}
        className="mb-2"
      >
        {label}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const charCount = (field.value as string)?.length || 0

          return (
            <>
              <textarea
                {...field}
                {...props}
                id={name}
                maxLength={maxLength}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg text-text-pale focus:outline-none text-base font-[var(--font-merriweather)] h-[160px]',
                  theme === 'dark' ? 'bg-primary-hover text-text-pale' : 'bg-white text-[#2c2c2c]',
                  fieldState.error ? 'border-danger-main' : 'border-primary-main',
                  className
                )}
              />
              {maxLength && (
                <Typography size="bodyXS" color={charCount > maxLength ? "dangerMain" : (theme === 'dark' ? "primaryFocus" : "black")} className="mt-1">
                  {charCount}/{maxLength} characters
                </Typography>
              )}
              {(fieldState.error || error) && (
                <Typography size="bodyXS" color="dangerMain" className="mt-2">
                  {error || fieldState.error?.message}
                </Typography>
              )}
            </>
          )
        }}
      />
      {description ? (
        <Typography size="bodyXS" color={theme === 'dark' ? "primaryFocus" : "black"} className="mt-2">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}

export default Textarea
