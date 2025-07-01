import React, { InputHTMLAttributes } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

interface CheckboxProps<T extends FieldValues> extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  name: Path<T>;
  control: Control<T>;
  error?: string;
}

const Checkbox = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  className = '',
  description,
  ...props
}: CheckboxProps<T>) => {
  return (
    <div className="mb-4">
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <>
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...field}
                  {...props}
                  type="checkbox"
                  id={name}
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                    fieldState.error ? 'border-red-500' : 'border-gray-300'
                  } ${className}`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={name} className="font-medium text-gray-700">
                  {label}
                </label>
                {description && (
                  <p className="text-gray-500">{description}</p>
                )}
              </div>
            </div>
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

export default Checkbox; 