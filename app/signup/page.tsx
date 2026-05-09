import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card">
          <h1 className="text-2xl font-semibold text-white">
            Start closing more jobs
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Free 7-day trial. No credit card required.
          </p>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-ink-400">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-300 hover:text-brand-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
