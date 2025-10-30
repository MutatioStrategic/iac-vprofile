/**
 * Generic Number/Currency Field Component
 */

'use client';

import React from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';

interface NumberFieldProps {
  field: FieldDefinition;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
}

export function NumberField({ field, value, onChange, disabled, error }: NumberFieldProps) {
  const isCurrency = field.type === 'currency';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseFloat(e.target.value);
    onChange(isNaN(numValue) ? 0 : numValue);
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

      <div className="relative">
        {isCurrency && (
          <span className="absolute left-3 top-2 text-gray-500">$</span>
        )}
        <input
          type="number"
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || field.readOnly}
          min={field.validation?.min}
          max={field.validation?.max}
          step={isCurrency ? '0.01' : '1'}
          placeholder={field.placeholder}
          className={`
            w-full px-3 py-2 border rounded-lg
            ${isCurrency ? 'pl-7' : ''}
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
