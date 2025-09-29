import Link from 'next/link';
import RegisterForm from './register-form';

export default function Register() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-fase-paper">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-lg border border-fase-silver shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-silver bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src="/fase-logo-mark.png" 
              alt="FASE Logo" 
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-2xl font-noto-serif font-bold text-fase-navy">FASE</h1>
          </div>
          <h3 className="text-xl font-noto-serif font-semibold text-fase-navy">Create Account</h3>
        </div>
        <div className="bg-white px-4 py-8 sm:px-16">
          <RegisterForm />
          <p className="text-center text-sm text-fase-steel mt-6">
            {"Already have an account? "}
            <Link href="/login" className="font-semibold text-fase-navy hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
