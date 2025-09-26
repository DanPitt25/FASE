import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from './login-form';

export default function Login() {
  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-fase-paper">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-lg border border-fase-silver shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-fase-silver bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src="/europe.jpg" 
              alt="Europe Map" 
              className="h-10 w-auto object-contain"
              style={{
                filter: 'brightness(0.8) contrast(1.2) saturate(0.7)',
              }}
            />
            <h1 className="text-2xl font-playfair font-bold text-fase-navy">FASE</h1>
          </div>
          <h3 className="text-xl font-playfair font-semibold text-fase-navy">Sign In</h3>
          <p className="text-sm text-fase-steel">
            Access your FASE member portal
          </p>
        </div>
        <div className="bg-white px-4 py-8 sm:px-16">
          <Suspense fallback={<div className="animate-pulse h-64 bg-fase-pearl rounded"></div>}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-fase-steel mt-6">
            {"Don't have an account? "}
            <Link href="/register" className="font-semibold text-fase-navy hover:underline">
              Sign up
            </Link>
            {' for free.'}
          </p>
        </div>
      </div>
    </div>
  );
}
