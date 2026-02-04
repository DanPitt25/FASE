import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

type HeroVariant = 'brand' | 'page' | 'content' | 'feature' | 'minimal';
type BackgroundTreatment = 'solid' | 'gradient' | 'image' | 'pattern';
type LayoutPattern = 'centered' | 'split' | 'layered';

interface TitleHeroProps {
  title: string;
  subtitle?: string;
  variant?: HeroVariant;
  backgroundTreatment?: BackgroundTreatment;
  layoutPattern?: LayoutPattern;
  backgroundClass?: string;
  backgroundImage?: string;
  fullHeight?: boolean;
  id?: string;
  useDefaultSubtitle?: boolean;
  primaryCTA?: {
    text: string;
    href: string;
    variant?: 'primary' | 'secondary';
  };
  secondaryCTA?: {
    text: string;
    href: string;
    variant?: 'primary' | 'secondary';
  };
  breadcrumbs?: string[];
  features?: string[];
}

const DEFAULT_FASE_SUBTITLE = "FASE - Fédération des Agences de Souscription Européennes - representing the MGA community across Europe.";

const getVariantStyles = (variant: HeroVariant) => {
  switch (variant) {
    case 'brand':
      return {
        height: 'min-h-screen flex items-center',
        titleSize: 'text-5xl sm:text-6xl lg:text-7xl',
        subtitleSize: 'text-2xl sm:text-3xl',
        showCTAs: true,
        showLogo: true
      };
    case 'page':
      return {
        height: 'py-16 md:py-24',
        titleSize: 'text-3xl sm:text-4xl lg:text-5xl',
        subtitleSize: 'text-lg sm:text-xl',
        showCTAs: false,
        showLogo: false
      };
    case 'content':
      return {
        height: 'py-20 md:py-32',
        titleSize: 'text-4xl sm:text-5xl lg:text-6xl',
        subtitleSize: 'text-xl sm:text-2xl',
        showCTAs: true,
        showLogo: false
      };
    case 'feature':
      return {
        height: 'py-24 md:py-40',
        titleSize: 'text-4xl sm:text-5xl lg:text-6xl',
        subtitleSize: 'text-xl sm:text-2xl',
        showCTAs: true,
        showLogo: false
      };
    case 'minimal':
      return {
        height: 'py-12 md:py-16',
        titleSize: 'text-2xl sm:text-3xl lg:text-4xl',
        subtitleSize: 'text-lg',
        showCTAs: false,
        showLogo: false
      };
    default:
      return {
        height: 'py-24',
        titleSize: 'text-4xl sm:text-5xl lg:text-6xl',
        subtitleSize: 'text-xl sm:text-2xl',
        showCTAs: false,
        showLogo: false
      };
  }
};

const getBackgroundStyles = (treatment: BackgroundTreatment, backgroundClass?: string) => {
  switch (treatment) {
    case 'solid':
      return backgroundClass || 'bg-fase-navy';
    case 'gradient':
      return 'bg-gradient-to-br from-fase-navy via-fase-navy to-fase-light-blue';
    case 'image':
      return 'bg-fase-navy';
    case 'pattern':
      return backgroundClass || 'bg-fase-navy';
    default:
      return backgroundClass || 'bg-fase-navy';
  }
};

export default function TitleHero({ 
  title, 
  subtitle, 
  variant = 'page',
  backgroundTreatment = 'solid',
  layoutPattern = 'centered',
  backgroundClass,
  backgroundImage,
  fullHeight,
  id,
  useDefaultSubtitle = false,
  primaryCTA,
  secondaryCTA,
  breadcrumbs,
  features
}: TitleHeroProps) {
  const variantStyles = getVariantStyles(variant);
  const heightClass = fullHeight ? 'min-h-[calc(100vh-5.5rem)] flex items-center' : variantStyles.height;
  const backgroundStyles = getBackgroundStyles(backgroundTreatment, backgroundClass);
  const finalSubtitle = useDefaultSubtitle ? DEFAULT_FASE_SUBTITLE : subtitle;
  
  const renderContent = () => {
    if (layoutPattern === 'split') {
      return (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-left">
              {breadcrumbs && (
                <nav className="mb-6">
                  <ol className="flex items-center space-x-2 text-fase-cream text-sm">
                    {breadcrumbs.map((crumb, index) => (
                      <li key={index}>
                        {index > 0 && <span className="mx-2">/</span>}
                        <span className={index === breadcrumbs.length - 1 ? 'font-medium' : 'opacity-75'}>
                          {crumb}
                        </span>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <h1 className={`${variantStyles.titleSize} font-noto-serif font-bold text-white mb-6 leading-tight`}>
                {title}
              </h1>
              {finalSubtitle && (
                <p className={`${variantStyles.subtitleSize} text-fase-cream leading-relaxed mb-8`}>
                  {finalSubtitle}
                </p>
              )}
              {variantStyles.showCTAs && (primaryCTA || secondaryCTA) && (
                <div className="flex flex-col sm:flex-row gap-4">
                  {primaryCTA && (
                    <a 
                      href={primaryCTA.href} 
                      className="inline-flex items-center justify-center px-8 py-3 bg-fase-gold text-fase-navy font-medium rounded hover:bg-fase-light-gold transition-colors"
                    >
                      {primaryCTA.text}
                    </a>
                  )}
                  {secondaryCTA && (
                    <a 
                      href={secondaryCTA.href} 
                      className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-medium rounded hover:bg-white hover:text-fase-navy transition-colors"
                    >
                      {secondaryCTA.text}
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Right Visual */}
            <div className="flex justify-center lg:justify-end">
              {features && (
                <div className="bg-white bg-opacity-10 rounded-lg p-8 backdrop-blur-sm">
                  <h3 className="text-xl font-noto-serif font-bold text-white mb-4">Key Features</h3>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center text-fase-cream">
                        <svg className="w-5 h-5 text-fase-gold mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (layoutPattern === 'layered') {
      return (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          {/* Background Text */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <span className="text-9xl font-noto-serif font-bold text-white whitespace-nowrap">
              FASE
            </span>
          </div>
          
          {/* Foreground Content */}
          <div className="relative text-center">
            {breadcrumbs && (
              <nav className="mb-6">
                <ol className="flex items-center justify-center space-x-2 text-fase-cream text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={index}>
                      {index > 0 && <span className="mx-2">/</span>}
                      <span className={index === breadcrumbs.length - 1 ? 'font-medium' : 'opacity-75'}>
                        {crumb}
                      </span>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <h1 className={`${variantStyles.titleSize} font-noto-serif font-bold text-white mb-6 leading-tight`}>
              {title}
            </h1>
            {finalSubtitle && (
              <p className={`${variantStyles.subtitleSize} text-fase-cream max-w-4xl mx-auto leading-relaxed mb-8`}>
                {finalSubtitle}
              </p>
            )}
            {variantStyles.showCTAs && (primaryCTA || secondaryCTA) && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {primaryCTA && (
                  <a 
                    href={primaryCTA.href} 
                    className="inline-flex items-center justify-center px-8 py-3 bg-fase-gold text-fase-navy font-medium rounded hover:bg-fase-light-gold transition-colors"
                  >
                    {primaryCTA.text}
                  </a>
                )}
                {secondaryCTA && (
                  <a 
                    href={secondaryCTA.href} 
                    className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-medium rounded hover:bg-white hover:text-fase-navy transition-colors"
                  >
                    {secondaryCTA.text}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Default centered layout
    return (
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        {breadcrumbs && (
          <nav className="mb-6">
            <ol className="flex items-center justify-center space-x-2 text-fase-cream text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index}>
                  {index > 0 && <span className="mx-2">/</span>}
                  <span className={index === breadcrumbs.length - 1 ? 'font-medium' : 'opacity-75'}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {variantStyles.showLogo && (
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-white bg-opacity-10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl font-noto-serif font-bold text-fase-gold">F</span>
            </div>
          </div>
        )}
        <h1 className={`${variantStyles.titleSize} font-noto-serif font-bold text-white mb-6 leading-tight`}>
          {title}
        </h1>
        {finalSubtitle && (
          <p className={`${variantStyles.subtitleSize} text-fase-cream max-w-4xl mx-auto leading-relaxed mb-8`}>
            {finalSubtitle}
          </p>
        )}
        {variantStyles.showCTAs && (primaryCTA || secondaryCTA) && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {primaryCTA && (
              <a 
                href={primaryCTA.href} 
                className="inline-flex items-center justify-center px-8 py-3 bg-fase-gold text-fase-navy font-medium rounded hover:bg-fase-light-gold transition-colors"
              >
                {primaryCTA.text}
              </a>
            )}
            {secondaryCTA && (
              <a 
                href={secondaryCTA.href} 
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white font-medium rounded hover:bg-white hover:text-fase-navy transition-colors"
              >
                {secondaryCTA.text}
              </a>
            )}
          </div>
        )}
        {features && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm">
                <span className="text-fase-cream text-sm">{feature}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section id={id} className={`relative ${backgroundStyles} ${heightClass} overflow-hidden`}>
      {/* Background Image */}
      {(backgroundTreatment === 'image' || backgroundImage) && backgroundImage && (
        <div className="absolute inset-0">
          <Image 
            src={backgroundImage} 
            alt="" 
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-fase-navy bg-opacity-75"></div>
        </div>
      )}
      
      {/* Pattern Overlay */}
      {backgroundTreatment === 'pattern' && !backgroundImage && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
      )}
      
      {renderContent()}
    </section>
  );
}