import React, { useCallback, useState, useRef } from 'react';
import { Control, Controller, ControllerRenderProps, FieldValues, Path } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface FileUploadProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  control: Control<T>;
  error?: string;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
}

const FileUpload = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  maxFiles = 4,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }
}: FileUploadProps<T>) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fieldRef = useRef<ControllerRenderProps<T, Path<T>>>(null);

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.urls;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = [...uploadedFiles, ...acceptedFiles].slice(0, maxFiles);
    setUploadedFiles(newFiles);

    try {
      const newUrls = await uploadFiles(acceptedFiles);
      if (fieldRef.current) {
        const currentUrls = fieldRef.current.value || [];
        const allUrls = [...currentUrls, ...newUrls];
        fieldRef.current?.onChange(allUrls);
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      setUploadedFiles(uploadedFiles);
    }
  }, [uploadedFiles, maxFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_: File, i: number) => i !== index);
      if (fieldRef.current) {
        const currentUrls = fieldRef.current.value || [];
        const newUrls = currentUrls?.filter((_: string, i: number) => i !== index);
        fieldRef.current?.onChange(newUrls);
      }
      return newFiles;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - uploadedFiles.length,
  });

  return (
    <div className="mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        {label}
      </label>

      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          // Store field reference
          fieldRef.current = field;

          return (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                  } ${fieldState.error ? 'border-red-500' : ''}`}
              >
                <input {...getInputProps()} />

                <div className="space-y-2">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="text-gray-600">
                    {uploading ? (
                      <p>Uploading...</p>
                    ) : isDragActive ? (
                      <p>Drop the files here...</p>
                    ) : (
                      <div>
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">
                          PNG, JPG, GIF, WEBP up to 5MB (max {maxFiles} files)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* File previews */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {file.type.startsWith('image/') && (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              width={100}
                              height={100}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(fieldState.error || error) && (
                <p className="mt-1 text-sm text-red-600">
                  {error || fieldState.error?.message}
                </p>
              )}
            </>
          );
        }}
      />
    </div>
  );
};

export default FileUpload; 