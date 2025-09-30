interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({ 
  children, 
  href, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  className = '',
  disabled = false,
  type = 'button'
}: ButtonProps) {
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: 'bg-fase-navy text-white hover:bg-fase-black border-2 border-fase-navy hover:border-fase-black',
    secondary: 'bg-white text-fase-black border-2 border-fase-black hover:bg-fase-light-blue hover:border-fase-navy hover:text-fase-navy',
    ghost: 'bg-transparent text-fase-black border-2 border-transparent hover:border-fase-black hover:bg-fase-light-blue'
  };

  const baseClasses = `
    ${sizeClasses[size]} 
    ${variantClasses[variant]} 
    font-medium 
    transition-all 
    duration-200 
    hover:translate-y-[-1px] 
    focus:outline-none 
    focus:ring-2 
    focus:ring-fase-navy 
    focus:ring-offset-2
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  if (href && !disabled) {
    return (
      <a href={href} className={baseClasses}>
        {children}
      </a>
    );
  }

  return (
    <button 
      type={type}
      onClick={disabled ? undefined : onClick} 
      className={baseClasses}
      disabled={disabled}
    >
      {children}
    </button>
  );
}