export default function Footer() {
  return (
    <footer className="bg-fase-black text-white py-12 border-t-4 border-fase-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-noto-serif font-bold mb-4 text-white">FASE</h3>
            <p className="text-fase-cream">
              The Federation of European MGAs - representing the MGA community across Europe.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">Membership</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="/join" className="hover:text-fase-navy transition duration-200">Join FASE</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="/knowledge" className="hover:text-fase-navy transition duration-200">Knowledge Base</a></li>
              <li><a href="/events" className="hover:text-fase-navy transition duration-200">Events</a></li>
              <li><a href="/news" className="hover:text-fase-navy transition duration-200">News</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-noto-serif font-semibold mb-4 text-white">Connect</h4>
            <ul className="space-y-2 text-fase-cream">
              <li><a href="mailto:info@fasemga.com" className="hover:text-fase-navy transition duration-200">Contact Us</a></li>
              <li><a href="/member-portal" className="hover:text-fase-navy transition duration-200">Member Portal</a></li>
              <li><a href="/about" className="hover:text-fase-navy transition duration-200">About FASE</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-fase-gold mt-8 pt-8 text-center text-fase-cream">
          <p>&copy; 2025 FASE B.V. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}