interface TitleHeroProps {
  title: string;
  subtitle?: string;
  backgroundClass?: string;
  backgroundImage?: string;
  fullHeight?: boolean;
  id?: string;
  useDefaultSubtitle?: boolean;
}

const DEFAULT_FASE_SUBTITLE = "FASE - The Federation of European MGAs - representing the MGA community across Europe.";

export default function TitleHero({ 
  title, 
  subtitle, 
  backgroundClass = "bg-fase-navy",
  backgroundImage,
  fullHeight = true,
  id,
  useDefaultSubtitle = false
}: TitleHeroProps) {
  const heightClass = fullHeight ? 'min-h-[calc(100vh-5.5rem)] flex items-center' : 'py-24';
  const finalSubtitle = useDefaultSubtitle ? DEFAULT_FASE_SUBTITLE : subtitle;
  
  return (
    <section id={id} className={`relative ${backgroundClass} ${heightClass} overflow-hidden`}>
      {/* Background Image */}
      {backgroundImage && (
        <div className="absolute inset-0">
          <img 
            src={backgroundImage} 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-fase-navy bg-opacity-75"></div>
        </div>
      )}
      
      {/* Pattern Overlay (only if no background image) */}
      {!backgroundImage && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
      )}
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-playfair font-bold text-white mb-6 leading-tight">
          {title}
        </h1>
        {finalSubtitle && (
          <p className="text-xl sm:text-2xl text-fase-paper max-w-4xl mx-auto leading-relaxed">
            {finalSubtitle}
          </p>
        )}
      </div>
    </section>
  );
}