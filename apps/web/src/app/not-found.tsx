import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="text-6xl font-bold text-yellow-400">404</h1>
      <p className="mt-4 text-lg text-neutral-400">Page not found</p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-3 text-sm font-bold text-black transition hover:from-yellow-400 hover:to-yellow-500"
      >
        Go Home
      </Link>
    </div>
  );
}
