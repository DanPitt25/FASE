import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
      <p className="text-gray-600 mb-8">
        The article you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="text-gray-500 hover:text-gray-900">
        &larr; Back to homepage
      </Link>
    </div>
  );
}
