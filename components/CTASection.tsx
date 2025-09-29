interface CTAButton {
  text: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

interface CTASectionProps {
  title: string;
  description: string;
  buttons: CTAButton[];
  background?: 'navy' | 'white' | 'paper';
  size?: 'compact' | 'standard' | 'large';
  id?: string;
}

export default function CTASection({ 
  title, 
  description, 
  buttons, 
  background = 'navy',
  size = 'standard',
  id
}: CTASectionProps) {
  const sizeClasses = {
    compact: {
      section: 'py-12',
      title: 'text-2xl sm:text-3xl',
      description: 'text-base sm:text-lg',
      buttons: 'px-6 py-3 text-base'
    },
    standard: {
      section: 'py-16',
      title: 'text-3xl sm:text-4xl md:text-5xl',
      description: 'text-base sm:text-lg md:text-xl lg:text-2xl',
      buttons: 'px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl'
    },
    large: {
      section: 'py-20 md:py-24',
      title: 'text-4xl sm:text-5xl md:text-6xl',
      description: 'text-lg sm:text-xl md:text-2xl',
      buttons: 'px-10 sm:px-14 py-5 sm:py-6 text-xl sm:text-2xl'
    }
  };

  const backgroundClasses = {
    navy: {
      section: 'bg-fase-navy',
      title: 'text-white',
      description: 'text-fase-paper'
    },
    white: {
      section: 'bg-white',
      title: 'text-fase-navy',
      description: 'text-fase-steel'
    },
    paper: {
      section: 'bg-fase-paper',
      title: 'text-fase-navy',
      description: 'text-fase-steel'
    }
  };

  const getButtonClasses = (variant: 'primary' | 'secondary' = 'primary') => {
    const baseClasses = `${sizeClasses[size].buttons} font-medium transition duration-300 hover:translate-y-[-1px] shadow-lg`;
    
    if (background === 'navy') {
      return variant === 'primary' 
        ? `${baseClasses} bg-white text-fase-navy hover:bg-fase-paper`
        : `${baseClasses} bg-transparent text-white border-2 border-white hover:bg-white hover:text-fase-navy`;
    } else {
      return variant === 'primary'
        ? `${baseClasses} bg-fase-navy text-white hover:bg-fase-steel`
        : `${baseClasses} bg-white text-fase-navy border-2 border-fase-navy hover:bg-fase-paper`;
    }
  };

  return (
    <section id={id} className={`min-h-screen flex items-center ${backgroundClasses[background].section} ${sizeClasses[size].section}`}>
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
        <h2 className={`${sizeClasses[size].title} font-noto-serif font-bold ${backgroundClasses[background].title} mb-6 sm:mb-8`}>
          {title}
        </h2>
        <p className={`${sizeClasses[size].description} ${backgroundClasses[background].description} mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-4`}>
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {buttons.map((button, index) => (
            <a 
              key={index}
              href={button.href} 
              className={getButtonClasses(button.variant)}
            >
              {button.text}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}