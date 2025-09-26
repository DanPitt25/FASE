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
          <h4 className="font-playfair font-semibold text-fase-navy mb-1">{title}</h4>
          <p className="text-fase-steel text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-6 border border-fase-silver hover:shadow-lg hover:border-fase-navy transition-all duration-300">
      <div className="w-16 h-16 bg-fase-navy flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h4 className="text-lg font-playfair font-semibold text-fase-navy mb-2">{title}</h4>
      <p className="text-fase-steel text-sm leading-relaxed">{description}</p>
    </div>
  );
}