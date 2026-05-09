import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">Not found</h1>
        <p className="mt-2 text-gray-600">We couldn't find what you were looking for.</p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}
