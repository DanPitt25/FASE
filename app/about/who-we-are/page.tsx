'use client';

import { useState } from 'react';
import Header from '../../../components/Header';

export default function WhoWeArePage() {
  const [headerLoaded, setHeaderLoaded] = useState(false);

  return (
    <div className={`min-h-screen bg-fase-ice-blue font-lato transition-opacity duration-300 ${headerLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <Header currentPage="who-we-are" onLoad={() => setHeaderLoaded(true)} />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section with Background Image */}
        <section className="relative bg-fase-navy py-24 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <nav className="flex justify-center mb-8">
              <ol className="flex items-center space-x-2 text-sm">
                <li><a href="/" className="text-fase-ice-blue hover:text-white">Home</a></li>
                <li className="text-fase-ice-blue">/</li>
                <li><a href="/about" className="text-fase-ice-blue hover:text-white">About</a></li>
                <li className="text-fase-ice-blue">/</li>
                <li className="text-white font-medium">Who We Are</li>
              </ol>
            </nav>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-futura font-bold text-white mb-6 leading-tight">
              Who We Are
            </h1>
            <p className="text-xl sm:text-2xl text-fase-ice-blue max-w-4xl mx-auto leading-relaxed">
              The voice of Managing General Agents across Europe, driving innovation and excellence in the insurance marketplace.
            </p>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Content */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Our Mission</h2>
                  <p className="text-lg text-fase-dark-slate leading-relaxed mb-6">
                    FASE exists to elevate the profile and influence of Managing General Agents across Europe. We serve as the unified voice for MGAs, advocating for their interests while fostering collaboration between MGAs, capacity providers, and service organizations.
                  </p>
                  <p className="text-lg text-fase-dark-slate leading-relaxed">
                    Through strategic advocacy, market intelligence, and professional networking, we strengthen the entire MGA ecosystem and drive sustainable growth across European insurance markets.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-sage rounded-full"></div>
                    <span className="text-fase-dark-slate font-medium">Industry Leadership</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-navy rounded-full"></div>
                    <span className="text-fase-dark-slate font-medium">Market Innovation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-fase-orange rounded-full"></div>
                    <span className="text-fase-dark-slate font-medium">Professional Excellence</span>
                  </div>
                </div>
              </div>

              {/* Image Placeholder */}
              <div className="relative">
                <div className="aspect-w-4 aspect-h-3 rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="/london.jpg" 
                    alt="European Business District" 
                    className="w-full h-96 object-cover"
                    style={{
                      filter: 'brightness(0.9) contrast(1.1) saturate(1.2)'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/20 to-transparent"></div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-fase-orange rounded-full opacity-20 blur-xl"></div>
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-fase-sage rounded-full opacity-30 blur-lg"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-fase-ice-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Our Core Values</h2>
              <p className="text-xl text-fase-dark-slate max-w-3xl mx-auto">
                The principles that guide everything we do as we build the future of European MGA collaboration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Value 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-fase-sage to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Innovation</h3>
                <p className="text-fase-dark-slate leading-relaxed">
                  Championing forward-thinking approaches to insurance distribution and embracing digital transformation across the MGA landscape.
                </p>
              </div>

              {/* Value 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-fase-navy to-blue-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Collaboration</h3>
                <p className="text-fase-dark-slate leading-relaxed">
                  Building bridges between MGAs, insurers, and service providers to create a stronger, more connected European insurance ecosystem.
                </p>
              </div>

              {/* Value 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-fase-orange to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-futura font-bold text-fase-navy mb-4">Excellence</h3>
                <p className="text-fase-dark-slate leading-relaxed">
                  Setting the highest standards for professional conduct, market practices, and service delivery throughout our community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Leadership Team</h2>
              <p className="text-xl text-fase-dark-slate max-w-3xl mx-auto">
                Industry veterans and visionaries driving FASE's mission across European markets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Leadership placeholder cards */}
              {[
                { name: "[Name]", role: "[Chief Executive Officer]", location: "London", image: "/london.jpg" },
                { name: "[Name]", role: "[Head of European Operations]", location: "Hamburg", image: "/hamburg.jpg" },
                { name: "[Name]", role: "[Director of Member Relations]", location: "Paris", image: "/paris.jpg" }
              ].map((leader, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={leader.image} 
                      alt={`${leader.name} - ${leader.location}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      style={{ filter: 'brightness(0.9) contrast(1.1)' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-fase-navy/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <div className="text-sm opacity-90">{leader.location}</div>
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-futura font-bold text-fase-navy mb-2">{leader.name}</h3>
                    <p className="text-fase-dark-slate font-medium">{leader.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-fase-navy">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-futura font-bold text-white mb-6">Our Growing Community</h2>
              <p className="text-xl text-fase-ice-blue max-w-3xl mx-auto">
                Building momentum across European markets as we work toward our official launch.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-5xl font-futura font-bold text-fase-orange">15+</div>
                <div className="text-fase-ice-blue">Countries Represented</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-futura font-bold text-fase-orange">150+</div>
                <div className="text-fase-ice-blue">Industry Partners</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-futura font-bold text-fase-orange">€2.5B+</div>
                <div className="text-fase-ice-blue">Combined Premium Volume</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-futura font-bold text-fase-orange">50</div>
                <div className="text-fase-ice-blue">MGAs Needed for Launch</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-fase-ice-blue">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-futura font-bold text-fase-navy mb-6">Ready to Shape the Future?</h2>
            <p className="text-xl text-fase-dark-slate mb-8 max-w-3xl mx-auto">
              Join the growing community of forward-thinking MGAs and industry partners building the future of European insurance distribution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/join" className="bg-fase-navy text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-fase-dark-slate transition duration-300 shadow-lg">
                Join FASE Today
              </a>
              <a href="/about" className="bg-white text-fase-navy px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-50 transition duration-300 shadow-lg border border-fase-light-gray">
                Learn More About Us
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}