import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMPTY_VALUE = '__EMPTY__';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onValueChange, options, placeholder = 'Selecione...', disabled, error, className }, ref) => {
    // Map empty string to internal value (Radix doesn't allow empty string as item value)
    const internalValue = value === '' ? EMPTY_VALUE : value;

    const handleValueChange = (newValue: string) => {
      // Map internal empty value back to empty string
      onValueChange?.(newValue === EMPTY_VALUE ? '' : newValue);
    };

    // Map options with empty values to internal representation
    const mappedOptions = options.map((opt) => ({
      ...opt,
      value: opt.value === '' ? EMPTY_VALUE : opt.value,
    }));

    return (
      <SelectPrimitive.Root value={internalValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2',
            'rounded-2xl px-3 py-2 text-sm',
            'bg-black/30 text-gray-100 backdrop-blur-xl',
            'border border-white/10',
            'focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/20',
            'transition-all duration-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500/50',
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              'relative z-50 overflow-hidden',
              'rounded-2xl border border-white/10',
              'bg-black/70 backdrop-blur-xl',
              'text-gray-100 shadow-xl shadow-black/20',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2'
            )}
            position="popper"
            sideOffset={4}
            style={{ minWidth: 'var(--radix-select-trigger-width)' }}
          >
            <SelectPrimitive.Viewport className="p-1">
              {mappedOptions.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center',
                    'rounded-xl px-3 py-2 pr-8 text-sm outline-none',
                    'text-gray-200',
                    'focus:bg-white/10 focus:text-white',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2">
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);

Select.displayName = 'Select';
