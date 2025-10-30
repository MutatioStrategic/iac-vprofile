/**
 * Generic Text Field Component
 * Renders text, email, phone, and textarea fields
 */

'use client';

import React from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';

interface TextFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function TextField({ field, value, onChange, disabled, error }: TextFieldProps) {
  const isTextarea = field.type === 'textarea';
  const inputType = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text';

  const baseClasses = `
    w-full px-3 py-2 border rounded-lg
    focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${error ? 'border-red-500' : 'border-gray-300'}
  `;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
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

      {isTextarea ? (
        <textarea
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || field.readOnly}
          placeholder={field.placeholder}
          rows={4}
          className={baseClasses}
        />
      ) : (
        <input
          type={inputType}
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || field.readOnly}
          placeholder={field.placeholder}
          pattern={field.validation?.pattern}
          className={baseClasses}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
