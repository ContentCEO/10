"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProposalPhoto } from "@/lib/types";

export function PhotoUpload({
  userId,
  photos,
  onChange,
}: {
  userId: string;
  photos: ProposalPhoto[];
  onChange: (next: ProposalPhoto[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const uploaded: ProposalPhoto[] = [];
    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("proposal-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { data } = supabase.storage.from("proposal-photos").getPublicUrl(path);
      uploaded.push({ path, url: data.publicUrl, name: file.name });
    }
    setUploading(false);
    onChange([...photos, ...uploaded]);
  }

  function removePhoto(path: string) {
    onChange(photos.filter((p) => p.path !== path));
  }

  return (
    <div>
      <label className="label">Project photos</label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p) => (
          <div key={p.path} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(p.path)}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-gray-600 hover:border-brand-400 hover:text-brand-700">
          <Upload size={20} />
          <span>{uploading ? "Uploading…" : "Upload"}</span>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
