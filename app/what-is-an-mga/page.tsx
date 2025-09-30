'use client';

import PageLayout from '../../components/PageLayout';
import TitleHero from '../../components/TitleHero';
import ContentHero from '../../components/ContentHero';

export default function WhatIsAnMGAPage() {
  const sections = [
    { name: 'Overview', id: 'hero' },
    { name: 'Business Model', id: 'business-model' },
    { name: 'Innovation', id: 'innovation' }
  ];

  return (
    <PageLayout currentPage="what-is-an-mga" sections={sections}>
      <main className="flex-1">
        <TitleHero 
          id="hero"
          title="What is an MGA?"
          subtitle="Understanding Managing General Agents and their role in the insurance ecosystem"
          backgroundImage="/london.jpg"
          fullHeight={true}
        />

        <ContentHero 
          id="business-model" 
          fullHeight={false}
          className="bg-white py-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-6">The MGA Business Model</h2>
              </div>
              
              <div className="space-y-8 text-fase-black">
                <div className="bg-fase-cream p-8 rounded-lg">
                  <p className="text-xl leading-relaxed mb-0">
                    An MGA is a simplified insurance business that prices risk and distributes insurance. 
                    It does not maintain a large balance sheet to pay claims; instead it contracts with 
                    insurance companies that serve as capacity providers to the MGA. An insurance company 
                    grants a binding authority to an MGA, enabling it to underwrite a specified class of 
                    insurance on the insurance company&apos;s behalf.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <div>
                    <h3 className="text-2xl font-noto-serif font-semibold text-fase-navy mb-4">Focused Expertise</h3>
                    <p className="text-lg leading-relaxed">
                      MGAs are typically smaller than traditional balance sheet insurance companies. 
                      They focus on a limited number of insurance products in which they possess deep expertise. 
                      Many of the most challenging lines of insurance – including cyber risks and property 
                      perils affected by climate change – are handled by specialist MGAs.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-noto-serif font-semibold text-fase-navy mb-4">Key Characteristics</h3>
                    <ul className="space-y-3 text-lg">
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-fase-navy rounded-full mt-3 mr-3 flex-shrink-0"></div>
                        <span>Specialized risk expertise</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-fase-navy rounded-full mt-3 mr-3 flex-shrink-0"></div>
                        <span>Binding authority from insurers</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-fase-navy rounded-full mt-3 mr-3 flex-shrink-0"></div>
                        <span>No claims balance sheet</span>
                      </li>
                      <li className="flex items-start">
                        <div className="w-2 h-2 bg-fase-navy rounded-full mt-3 mr-3 flex-shrink-0"></div>
                        <span>Focus on distribution and underwriting</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentHero>

        <ContentHero 
          id="innovation" 
          fullHeight={false}
          className="bg-fase-light-blue py-16"
        >
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-noto-serif font-bold text-fase-navy mb-6">Innovation & Technology</h2>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-fase-light-gold">
              <p className="text-xl text-fase-black leading-relaxed">
                MGAs have generally found it easier to integrate new technology into their operations 
                than large insurance companies. They have thus been early adopters of technology to 
                improve the pricing of risk, increase operational efficiencies and enhance the customer experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Risk Pricing</h3>
                <p className="text-fase-black">Advanced analytics and AI for better risk assessment</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Operational Efficiency</h3>
                <p className="text-fase-black">Streamlined processes and automated workflows</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fase-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-noto-serif font-semibold text-fase-navy mb-2">Customer Experience</h3>
                <p className="text-fase-black">Digital platforms and enhanced service delivery</p>
              </div>
            </div>
          </div>
        </ContentHero>
      </main>
    </PageLayout>
  );
}