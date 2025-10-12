import Link from 'next/link';
import IntegratedRegisterForm from './integrated-register-form';

export default function Register() {
  return (
    <div className="min-h-screen bg-fase-light-blue py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl border border-fase-light-gold overflow-hidden">
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-light-gold bg-white px-6 py-8 text-center">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/fase-logo-mark.png" 
                alt="FASE Logo" 
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-2xl font-noto-serif font-bold text-fase-navy">FASE</h1>
            </div>
            <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Join FASE</h3>
            <p className="text-fase-black text-sm max-w-md">
              Create your account and apply for membership in one simple process
            </p>
          </div>
          <div className="bg-white px-6 py-8">
            <IntegratedRegisterForm />
            <p className="text-center text-sm text-fase-black mt-8">
              {"Already have an account? "}
              <Link href="/login" className="font-semibold text-fase-navy hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
