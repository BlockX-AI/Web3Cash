import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-medium tracking-tight">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-black transition-all duration-500 hover:rounded-[50px] hover:shadow-lg hover:shadow-accent/20"
      >
        Go Home
      </Link>
    </div>
  );
}
