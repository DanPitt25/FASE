export default function Footer() {
  return (
    <footer className="bg-fase-steel text-white py-12 border-t-4 border-fase-steel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-playfair font-bold mb-4 text-white">FASE</h3>
            <p className="text-fase-silver">
              The Federation of European MGAs - representing the MGA community across Europe.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-playfair font-semibold mb-4 text-white">Membership</h4>
            <ul className="space-y-2 text-fase-silver">
              <li><a href="#" className="hover:text-fase-navy transition duration-200">MGA Members</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Capacity Providers</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Service Providers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-playfair font-semibold mb-4 text-white">Resources</h4>
            <ul className="space-y-2 text-fase-silver">
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Knowledge Base</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Events</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">News</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-playfair font-semibold mb-4 text-white">Connect</h4>
            <ul className="space-y-2 text-fase-silver">
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Contact Us</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Member Portal</a></li>
              <li><a href="#" className="hover:text-fase-navy transition duration-200">Support</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-fase-platinum mt-8 pt-8 text-center text-fase-silver">
          <p>&copy; 2024 FASE - Federation of European MGAs. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}