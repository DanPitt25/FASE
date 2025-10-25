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
          </div>
        </div>
      </div>
    </div>
  );
}
