/**
 * Generic File Upload Field Component
 */

'use client';

import React, { useState } from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';

interface FileFieldProps {
  field: FieldDefinition;
  value: string; // URL to uploaded file
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function FileField({ field, value, onChange, disabled, error }: FileFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}

      {value ? (
        <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-sm text-blue-600 hover:underline truncate"
          >
            {value.split('/').pop()}
          </a>
          {!disabled && !field.readOnly && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div>
          <label
            className={`
              flex flex-col items-center justify-center w-full h-32
              border-2 border-dashed rounded-lg cursor-pointer
              ${disabled || field.readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
              ${error || uploadError ? 'border-red-500' : 'border-gray-300'}
            `}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <>
                  <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={disabled || field.readOnly || uploading}
            />
          </label>
        </div>
      )}

      {(error || uploadError) && (
        <p className="text-sm text-red-600">{error || uploadError}</p>
      )}
    </div>
  );
}
