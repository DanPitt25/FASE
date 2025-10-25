import Link from 'next/link';
import IntegratedRegisterForm from './integrated-register-form';

export default function Register() {
  return (
    <div className="min-h-screen bg-fase-navy py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center">
            <img 
              src="/fase-logo-rgb.png" 
              alt="FASE Logo" 
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="bg-white px-6 py-8">
            <IntegratedRegisterForm />
            
            {/* Alternative Options */}
            <div className="mt-8 text-center border-t border-fase-light-gold pt-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-fase-navy text-sm font-medium rounded-md text-fase-navy bg-white hover:bg-fase-cream transition-colors duration-200"
                >
                  Already have an account? Sign in
                </Link>
                <Link 
                  href="/join-company" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-fase-gold text-sm font-medium rounded-md text-fase-gold bg-white hover:bg-fase-light-blue transition-colors duration-200"
                >
                  My company is already a member
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
