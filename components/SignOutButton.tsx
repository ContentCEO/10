"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
