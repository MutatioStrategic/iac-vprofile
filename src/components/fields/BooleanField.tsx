/**
 * Generic Boolean/Checkbox Field Component
 */

'use client';

import React from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';

interface BooleanFieldProps {
  field: FieldDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: string;
}

export function BooleanField({ field, value, onChange, disabled, error }: BooleanFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={value || false}
          onChange={handleChange}
          disabled={disabled || field.readOnly}
          className={`
            mt-1 h-4 w-4 rounded border-gray-300
            text-blue-600 focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500">{field.description}</p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 ml-7">{error}</p>}
    </div>
  );
}
