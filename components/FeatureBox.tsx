interface FeatureBoxProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  layout?: 'vertical' | 'horizontal';
}

export default function FeatureBox({ 
  icon, 
  title, 
  description, 
  layout = 'vertical' 
}: FeatureBoxProps) {
  if (layout === 'horizontal') {
    return (
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-fase-navy flex items-center justify-center flex-shrink-0 mt-1">
          {icon}
        </div>
        <div>
          <h4 className="font-noto-serif font-semibold text-fase-navy mb-1">{title}</h4>
          <p className="text-fase-black text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-6 border border-fase-light-gold hover:shadow-lg hover:border-fase-navy transition-all duration-300">
      <div className="w-16 h-16 bg-fase-navy flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-noto-serif font-semibold text-fase-navy mb-2">{title}</h4>
      <p className="text-fase-black text-sm leading-relaxed">{description}</p>
    </div>
  );
}