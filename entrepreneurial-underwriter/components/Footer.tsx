export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 text-center">
        <p className="text-sm text-gray-500 mb-3">
          <a href="https://fasemga.com" className="hover:text-fase-navy transition-colors">FASE</a>
          <span className="mx-3 text-gray-300">·</span>
          <a href="https://mgarendezvous.com" className="hover:text-fase-navy transition-colors">MGA Rendezvous</a>
        </p>
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Fédération des Agences de Souscription Européennes
        </p>
      </div>
    </footer>
  );
}
