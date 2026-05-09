import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-slate-600">Page not found.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">Go home</Link>
      </div>
    </main>
  );
}
