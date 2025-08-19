interface TitleHeroProps {
  title: string;
  subtitle?: string;
  backgroundClass?: string;
  fullHeight?: boolean;
  id?: string;
}

export default function TitleHero({ 
  title, 
  subtitle, 
  backgroundClass = "bg-fase-navy",
  fullHeight = true,
  id
}: TitleHeroProps) {
  const heightClass = fullHeight ? 'min-h-screen flex items-center' : 'py-24';
  
  return (
    <section id={id} className={`relative ${backgroundClass} ${heightClass} overflow-hidden`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-futura font-bold text-white mb-6 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl sm:text-2xl text-fase-paper max-w-4xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}