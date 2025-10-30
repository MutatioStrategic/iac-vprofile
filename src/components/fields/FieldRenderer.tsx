/**
 * Generic Field Renderer
 * Dynamically renders the appropriate field component based on field type
 */

'use client';

import React from 'react';
import type { FieldDefinition } from '@/types/pipeline.types';
import { TextField } from './TextField';
import { SelectField } from './SelectField';
import { DateField } from './DateField';
import { NumberField } from './NumberField';
import { BooleanField } from './BooleanField';
import { FileField } from './FileField';

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  error?: string;
}

export function FieldRenderer({ field, value, onChange, disabled, error }: FieldRendererProps) {
  // Select component based on field type
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'textarea':
      return (
        <TextField
          field={field}
          value={value as string}
          onChange={onChange as (value: string) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'number':
    case 'currency':
      return (
        <NumberField
          field={field}
          value={value as number}
          onChange={onChange as (value: number) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <DateField
          field={field}
          value={value as string}
          onChange={onChange as (value: string) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'boolean':
      return (
        <BooleanField
          field={field}
          value={value as boolean}
          onChange={onChange as (value: boolean) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'select':
    case 'multiselect':
      return (
        <SelectField
          field={field}
          value={value as string | string[]}
          onChange={onChange as (value: string | string[]) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'file':
      return (
        <FileField
          field={field}
          value={value as string}
          onChange={onChange as (value: string) => void}
          disabled={disabled}
          error={error}
        />
      );

    case 'json':
      return (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p className="text-sm text-gray-500">{field.description}</p>
          )}
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Keep as string if invalid JSON
                onChange(e.target.value);
              }
            }}
            disabled={disabled || field.readOnly}
            rows={6}
            className={`
              w-full px-3 py-2 border rounded-lg font-mono text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Unknown field type: {field.type}
          </p>
        </div>
      );
  }
}

/**
 * Read-only field display
 */
export function FieldDisplay({ field, value }: { field: FieldDefinition; value: unknown }) {
  const formatValue = () => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">Not set</span>;
    }

    switch (field.type) {
      case 'boolean':
        return value ? (
          <span className="text-green-600">✓ Yes</span>
        ) : (
          <span className="text-gray-400">✗ No</span>
        );

      case 'date':
        return new Date(value as string).toLocaleDateString();

      case 'datetime':
        return new Date(value as string).toLocaleString();

      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value as number);

      case 'file':
        return (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View file →
          </a>
        );

      case 'select':
        const option = field.validation?.options?.find(o => o.value === value);
        return option?.label || value;

      case 'multiselect':
        const values = value as string[];
        const labels = values
          .map(v => field.validation?.options?.find(o => o.value === v)?.label || v)
          .join(', ');
        return labels;

      case 'json':
        return (
          <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
            {JSON.stringify(value, null, 2)}
          </pre>
        );

      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <div className="text-sm text-gray-900">{formatValue()}</div>
    </div>
  );
}
