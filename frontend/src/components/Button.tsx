import React from "react";

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  variant?: string;
  size?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, type = 'button', className = '', disabled = false, variant, size }) => (
  <button
    type={type}
    onClick={onClick}
    className={`px-4 py-2 bg-blue-600 text-white rounded ${className}`}
    disabled={disabled}
  >
    {children}
  </button>
);
  
  export default Button;