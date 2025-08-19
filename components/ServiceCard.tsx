interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

export default function ServiceCard({ 
  icon, 
  title, 
  description, 
  variant = 'primary',
  size = 'medium'
}: ServiceCardProps) {
  const sizeClasses = {
    small: {
      card: 'p-4',
      icon: 'w-12 h-12 mb-3',
      iconSvg: 'w-6 h-6',
      title: 'text-lg',
      description: 'text-sm'
    },
    medium: {
      card: 'p-6 sm:p-8',
      icon: 'w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6',
      iconSvg: 'w-8 h-8 sm:w-10 sm:h-10',
      title: 'text-xl sm:text-2xl',
      description: 'text-base sm:text-lg'
    },
    large: {
      card: 'p-8 sm:p-10',
      icon: 'w-20 h-20 sm:w-24 sm:h-24 mb-6 sm:mb-8',
      iconSvg: 'w-10 h-10 sm:w-12 sm:h-12',
      title: 'text-2xl sm:text-3xl',
      description: 'text-lg sm:text-xl'
    }
  };

  const variantClasses = {
    primary: {
      card: 'bg-white border border-fase-silver hover:shadow-xl hover:border-fase-navy transition-all duration-300 transform hover:translate-y-[-2px]',
      icon: 'bg-fase-navy text-white',
      title: 'text-fase-navy',
      description: 'text-fase-steel'
    },
    secondary: {
      card: 'bg-fase-paper border border-fase-silver hover:shadow-lg hover:border-fase-steel transition-all duration-300',
      icon: 'bg-fase-steel text-white',
      title: 'text-fase-navy',
      description: 'text-fase-steel'
    }
  };

  const classes = {
    card: `text-center ${sizeClasses[size].card} ${variantClasses[variant].card}`,
    icon: `${sizeClasses[size].icon} ${variantClasses[variant].icon} flex items-center justify-center mx-auto shadow-lg`,
    title: `${sizeClasses[size].title} font-futura font-semibold ${variantClasses[variant].title} mb-3 sm:mb-4`,
    description: `${sizeClasses[size].description} ${variantClasses[variant].description} leading-relaxed`
  };

  return (
    <div className={classes.card}>
      <div className={classes.icon}>
        {icon}
      </div>
      <h3 className={classes.title}>{title}</h3>
      <p className={classes.description}>{description}</p>
    </div>
  );
}