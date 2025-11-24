import React, { useCallback, useState, useRef } from 'react'
import {
  Control,
  Controller,
  ControllerRenderProps,
  FieldValues,
  Path,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Typography } from './Typography'
import { useTranslations } from 'next-intl'
import { createUniqueFiles } from '../../utils/fileUtils'

interface FileUploadProps<T extends FieldValues> {
  label: string
  name: Path<T>
  control: Control<T>
  setValue: UseFormSetValue<T>
  watch: UseFormWatch<T>
  error?: string
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: Record<string, string[]>
  description?: string
  theme?: 'dark' | 'light'
}

const FileUpload = <T extends FieldValues>({
  label,
  name,
  control,
  error,
  description,
  watch,
  theme = 'dark',
  maxFiles = 4,
  setValue,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
}: FileUploadProps<T>) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fieldRef = useRef<ControllerRenderProps<T, Path<T>>>(null)
  const i = useTranslations('inputs')

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    try {
      const formData = new FormData()
      // Create unique files to prevent overwrites
      const uniqueFiles = createUniqueFiles(files)

      uniqueFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.message || `Upload failed with status ${response.status}`
        )
      }

      const data = await response.json()
      return data.urls
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = [...uploadedFiles, ...acceptedFiles].slice(0, maxFiles)
      setUploadedFiles(newFiles)

      try {
        const newUrls = await uploadFiles(acceptedFiles)
        if (fieldRef.current) {
          const currentUrls = fieldRef.current.value || []
          const allUrls = [...currentUrls, ...newUrls]
          fieldRef.current?.onChange(allUrls)
        }
      } catch (error) {
        console.error('Failed to upload files:', error)
        setUploadedFiles(uploadedFiles)
      }
    },
    [uploadedFiles, maxFiles]
  )

  // const removeFile = useCallback((index: number) => {
  //   setUploadedFiles((prev) => {
  //     const newFiles = prev.filter((_: File, i: number) => i !== index)
  //     if (fieldRef.current) {
  //       const currentUrls = fieldRef.current.value || []
  //       const newUrls = currentUrls?.filter(
  //         (_: string, i: number) => i !== index
  //       )
  //       fieldRef.current?.onChange(newUrls)
  //     }
  //     return newFiles
  //   })
  // }, [])

  const removeFileOldFile = useCallback(
    (index: number) => {
      setValue(
        name,
        watch(name).filter((_: string, i: number) => i !== index)
      )
    },
    [name, setValue, watch]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: maxFiles - uploadedFiles.length,
  })

  return (
    <div className="mb-4">
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
        render={({ field, fieldState }) => {
          // Store field reference
          fieldRef.current = field

          return (
            <>
              <div
                {...getRootProps()}
                className={`w-full px-3 py-4 border rounded-lg focus:outline-none text-base text-text-pale font-[var(--font-merriweather)] ${
                  theme === 'dark' ? 'bg-primary-hover' : 'bg-brown-pale'
                } ${
                  isDragActive
                    ? 'border-primary-main bg-brown-pale'
                    : 'border-primary-main'
                } ${
                  fieldState.error
                    ? 'border-danger-main'
                    : 'border-primary-main'
                }`}
              >
                <input {...getInputProps()} />

                <div className="w-full h-full flex flex-col items-center justify-center text-center gap-2">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 44 44"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="44" height="44" rx="22" fill="#FFE7D0" />
                    <path
                      d="M18.9999 27.75C18.5899 27.75 18.2499 27.41 18.2499 27V22.81L17.5299 23.53C17.2399 23.82 16.7599 23.82 16.4699 23.53C16.1799 23.24 16.1799 22.76 16.4699 22.47L18.4699 20.47C18.6799 20.26 19.0099 20.19 19.2899 20.31C19.5699 20.42 19.7499 20.7 19.7499 21V27C19.7499 27.41 19.4099 27.75 18.9999 27.75Z"
                      fill="#241202"
                    />
                    <path
                      d="M20.9999 23.7499C20.8099 23.7499 20.6199 23.6799 20.4699 23.5299L18.4699 21.5299C18.1799 21.2399 18.1799 20.7599 18.4699 20.4699C18.7599 20.1799 19.2399 20.1799 19.5299 20.4699L21.5299 22.4699C21.8199 22.7599 21.8199 23.2399 21.5299 23.5299C21.3799 23.6799 21.1899 23.7499 20.9999 23.7499Z"
                      fill="#241202"
                    />
                    <path
                      d="M25 32.75H19C13.57 32.75 11.25 30.43 11.25 25V19C11.25 13.57 13.57 11.25 19 11.25H24C24.41 11.25 24.75 11.59 24.75 12C24.75 12.41 24.41 12.75 24 12.75H19C14.39 12.75 12.75 14.39 12.75 19V25C12.75 29.61 14.39 31.25 19 31.25H25C29.61 31.25 31.25 29.61 31.25 25V20C31.25 19.59 31.59 19.25 32 19.25C32.41 19.25 32.75 19.59 32.75 20V25C32.75 30.43 30.43 32.75 25 32.75Z"
                      fill="#241202"
                    />
                    <path
                      d="M32 20.75H28C24.58 20.75 23.25 19.42 23.25 16V12C23.25 11.7 23.43 11.42 23.71 11.31C23.99 11.19 24.31 11.26 24.53 11.47L32.53 19.47C32.74 19.68 32.81 20.01 32.69 20.29C32.57 20.57 32.3 20.75 32 20.75ZM24.75 13.81V16C24.75 18.58 25.42 19.25 28 19.25H30.19L24.75 13.81Z"
                      fill="#241202"
                    />
                  </svg>

                  <div className="text-gray-600">
                    {uploading ? (
                      <Typography size="bodyS" color="primaryFocus">
                        {i('uploading')}
                      </Typography>
                    ) : isDragActive ? (
                      <Typography size="bodyXS" color="primaryFocus">
                        {i('dropFiles')}
                      </Typography>
                    ) : (
                      <div>
                        <Typography size="bodyS" color="primaryFocus">
                          {i('uploadFile')}
                        </Typography>
                        <Typography size="bodyXS" color="primaryFocus">
                          {i('maxFileSize')}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {description ? (
                <Typography size="bodyXS" color="primaryFocus" className="mt-2">
                  {description}
                </Typography>
              ) : null}

              {/* File previews */}
              {/* {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Typography
                    size="bodyXS"
                    color="primaryFocus"
                    className="mb-2"
                  >
                    {i('selectedFiles')}
                  </Typography>
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
                        <Typography
                          size="bodyXS"
                          color="primaryFocus"
                          className="mt-2 truncate"
                        >
                          {file.name}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
              {watch(name).length > 0 && (
                <div className="mt-4 space-y-2">
                  <Typography
                    size="bodyXS"
                    color="primaryFocus"
                    className="mb-2"
                  >
                    {i('uploadedFiles')}
                  </Typography>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {watch(name).map((file: string, index: number) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={file}
                            alt={file}
                            className="w-full h-full object-cover"
                            width={100}
                            height={100}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFileOldFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                        <Typography
                          size="bodyXS"
                          color="primaryFocus"
                          className="mt-2 truncate"
                        >
                          {file}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
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
    </div>
  )
}

export default FileUpload
