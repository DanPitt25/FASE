export default function Page() {
  return (
    <div className="min-h-screen bg-fase-ice-blue">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-fase-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-futura font-bold text-fase-navy">FASE</h1>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-8">
              {/* About Us Dropdown */}
              <div className="relative group">
                <button className="text-fase-dark-slate hover:text-fase-navy px-3 py-2 text-sm font-medium flex items-center">
                  About Us
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-64 bg-white shadow-lg border border-fase-light-gray rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Who We Are</a>
                    <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Committees</a>
                    <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Membership Directory</a>
                    <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Affiliates & Associates</a>
                    <a href="#" className="block px-4 py-2 text-sm text-fase-dark-slate hover:bg-fase-ice-blue">Sponsors</a>
                  </div>
                </div>
              </div>

              {/* Join Us Dropdown */}
              <div className="relative group">
                <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                  Join Us
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">MGA</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Market Practitioner</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Supplier</a>
                  </div>
                </div>
              </div>

              {/* Sponsorship Link */}
              <a href="#" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Sponsorship</a>

              {/* Events Dropdown */}
              <div className="relative group">
                <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                  Events
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sample Event 1</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sample Event 2</a>
                  </div>
                </div>
              </div>

              {/* Knowledge & Education Dropdown */}
              <div className="relative group">
                <button className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium flex items-center">
                  Knowledge & Education
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 mt-2 w-48 bg-white shadow-lg border rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Example 1</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Example 2</a>
                  </div>
                </div>
              </div>

              {/* News Link */}
              <a href="#" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">News</a>

              {/* Member Portal */}
              <a href="#" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Member Portal</a>

              {/* Sign In Button */}
              <a href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">Sign In</a>
            </div>
            
            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              The Federation of European <span className="text-blue-600">MGAs</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              FASE represents MGAs, capacity providers, and service providers across Europe. Our multi-lingual digital platform provides technical, regulatory, and risk appetite resources for MGA members.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#" className="bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition duration-200">
                Register Interest
              </a>
              <a href="#" className="bg-white text-blue-600 px-8 py-3 rounded-md text-lg font-medium border border-blue-600 hover:bg-blue-50 transition duration-200">
                Amsterdam Conference
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Join FASE?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Demonstrating the dynamism of the MGA model at the continental level, based on accurate statistics rather than guesstimates.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border hover:shadow-lg transition duration-200">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Pan-European Network</h3>
              <p className="text-gray-600">Access a clearer pan-European picture for MGAs in national markets that are currently less well developed.</p>
            </div>
            
            <div className="text-center p-6 rounded-lg border hover:shadow-lg transition duration-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Digital Platform</h3>
              <p className="text-gray-600">Multi-lingual digital platform providing technical, regulatory, and risk appetite resources.</p>
            </div>
            
            <div className="text-center p-6 rounded-lg border hover:shadow-lg transition duration-200">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Flexible Business Model</h3>
              <p className="text-gray-600">The MGA business model is very flexible and takes many forms across Europe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Conference Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Amsterdam Conference 2024</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              The first pan-European MGA conference, organized by Lexicon Associates in conjunction with the Insurer, will be held on June 10/11 this year in Amsterdam.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Join Industry Leaders</h3>
              <p className="text-gray-600 mb-6">
                Connect with MGAs, capacity providers, and service providers from across Europe. Share insights, explore opportunities, and shape the future of the MGA industry.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500"><strong>Date:</strong> June 10-11, 2024</p>
                <p className="text-sm text-gray-500"><strong>Location:</strong> Amsterdam, Netherlands</p>
                <p className="text-sm text-gray-500"><strong>Organizers:</strong> Lexicon Associates & The Insurer</p>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Register for the Conference</h4>
              <p className="text-gray-600 mb-6">
                Don't miss this historic gathering of the European MGA community.
              </p>
              <a href="#" className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition duration-200 inline-block w-full text-center">
                Register Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Join the Federation
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            MGAs, capacity providers, and service providers are invited to register their interest in FASE membership. The federation will be officially launched when a quorum of fifty (50) MGAs have registered their interest. No membership dues will be payable before this point.
          </p>
          <a href="#" className="bg-white text-blue-600 px-8 py-3 rounded-md text-lg font-medium hover:bg-gray-100 transition duration-200">
            Register Interest
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">FASE</h3>
              <p className="text-gray-400">
                The Federation of European MGAs - representing the MGA community across Europe.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Membership</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">MGA Members</a></li>
                <li><a href="#" className="hover:text-white">Capacity Providers</a></li>
                <li><a href="#" className="hover:text-white">Service Providers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 FASE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
