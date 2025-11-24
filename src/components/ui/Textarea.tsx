import React, { InputHTMLAttributes } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Typography } from './Typography'
import { clsx } from 'clsx'

interface TextareaProps<T extends FieldValues>
  extends InputHTMLAttributes<HTMLTextAreaElement> {
  label: string
  description?: string
  name: Path<T>
  control: Control<T>
  theme?: 'dark' | 'light'
  error?: string
}

const Textarea = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  description,
  theme = 'dark',
  ...props
}: TextareaProps<T> & { description?: string }) => {
  return (
    <div>
      <Typography
        as="label"
        htmlFor={name}
        color="primaryFocus"
        className="mb-2"
      >
        {label}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <textarea
              {...field}
              {...props}
              id={name}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg text-text-pale focus:outline-none text-base font-[var(--font-merriweather)] h-[160px]',
                theme === 'dark' ? 'bg-primary-hover' : 'bg-brown-pale',
                fieldState.error ? 'border-danger-main' : 'border-primary-main',
                className
              )}
            />
            {(fieldState.error || error) && (
              <Typography size="bodyXS" color="dangerMain" className="mt-2">
                {error || fieldState.error?.message}
              </Typography>
            )}
          </>
        )}
      />
      {description ? (
        <Typography size="bodyXS" color="primaryFocus" className="mt-2">
          {description}
        </Typography>
      ) : null}
    </div>
  )
}

export default Textarea
