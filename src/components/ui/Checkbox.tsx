import React, { InputHTMLAttributes, ReactNode } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { Typography } from './Typography'
import { clsx } from 'clsx'

interface CheckboxProps<T extends FieldValues>
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: string
  name: Path<T>
  control: Control<T>
  error?: string
  theme?: 'dark' | 'light'
}

const Checkbox = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  theme = 'dark',
  ...props
}: CheckboxProps<T>) => {
  return (
    <div className={clsx('mb-4', className)}>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <div className="flex items-start">
              <div className="flex items-center h-5 relative">
                <div
                  className={clsx(
                    'w-4 h-4 border rounded-sm text-text-pale focus:outline-none border-primary-focus flex items-center justify-center',
                    theme === 'dark' ? 'bg-primary-hover!' : 'bg-brown-pale!',
                    fieldState.error
                      ? 'border-danger-main'
                      : 'border-primary-focus'
                  )}
                >
                  {field.value === true ? (
                    <i className="check text-sm w-3 h-3 text-primary-focus" />
                  ) : null}
                </div>
                <input
                  {...field}
                  {...props}
                  type="checkbox"
                  id={name}
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 absolute appearance-none cursor-pointer"
                />
              </div>
              <div className="ml-3 text-sm">
                {label}
                {/* {description && <p className="text-gray-500">{description}</p>} */}
              </div>
            </div>
            {(fieldState.error || error) && (
              <Typography size="bodyXS" color="dangerMain" className="mt-2">
                {error || fieldState.error?.message}
              </Typography>
            )}
          </>
        )}
      />
    </div>
  )
}

export default Checkbox
