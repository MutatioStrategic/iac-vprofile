/**
 * Generic Select Field Component
 * Renders select and multiselect fields
 */

'use client';

import React from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';

interface SelectFieldProps {
  field: FieldDefinition;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
  error?: string;
}

export function SelectField({ field, value, onChange, disabled, error }: SelectFieldProps) {
  const isMultiSelect = field.type === 'multiselect';
  const options = field.validation?.options || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isMultiSelect) {
      const selected = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selected);
    } else {
      onChange(e.target.value);
    }
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

      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || field.readOnly}
        multiple={isMultiSelect}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isMultiSelect ? 'min-h-[100px]' : ''}
        `}
      >
        {!isMultiSelect && (
          <option value="">Select {field.label}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {isMultiSelect && (
        <p className="text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
