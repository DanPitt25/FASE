interface QuoteSectionProps {
  quote: string;
  author: string;
  title: string;
  className?: string;
}

export default function QuoteSection({ 
  quote, 
  author, 
  title, 
  className = '' 
}: QuoteSectionProps) {
  return (
    <section className={`bg-white py-16 ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-xl sm:text-2xl font-noto-serif text-fase-navy leading-relaxed mb-8">
            &ldquo;{quote}&rdquo;
          </blockquote>
          <div className="flex flex-col items-center">
            <cite className="text-fase-black font-medium text-lg not-italic">{author}</cite>
            <p className="text-fase-black text-sm mt-1">{title}</p>
          </div>
        </div>
      </div>
    </section>
  );
}