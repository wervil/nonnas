import React, { InputHTMLAttributes } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

interface InputProps<T extends FieldValues> extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string
  name: Path<T>;
  control: Control<T>;
  error?: string;
}

const Input = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  description,
  ...props
}: InputProps<T> & { description?: string }) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {description ? <p className="text-xs text-gray-500 mb-1">{description}</p> : null}
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <input
              {...field}
              {...props}
              id={name}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                fieldState.error ? 'border-red-500' : 'border-gray-300'
              } ${className}`}
            />
            {(fieldState.error || error) && (
              <p className="mt-1 text-sm text-red-600">
                {error || fieldState.error?.message}
              </p>
            )}
          </>
        )}
      />
    </div>
  );
};

export default Input;