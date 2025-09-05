import React from "react";

interface TextInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  disabled?: boolean;
  id?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  autoFocus?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder = "", className = "", type = "text", disabled = false, id, onKeyPress, required, min, max, step, autoFocus }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    onKeyPress={onKeyPress}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    min={min}
    max={max}
    step={step}
    autoFocus={autoFocus}
    className={`border p-2 mb-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className}`}
  />
);

export default TextInput;