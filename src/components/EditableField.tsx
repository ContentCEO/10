"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "@/components/Toaster";

/*
 * Plan 1 / Section A / Idea #1 — Inline lead editor.
 *
 * Click-to-edit cell. Hover shows a small pencil; click swaps to an input.
 * Save on Enter or blur; cancel on Escape.
 *
 *   <EditableField
 *     value={lead.name}
 *     placeholder="Name"
 *     onSave={async (v) => await patch(lead.id, { name: v })}
 *   />
 *
 * Optimistic + toast feedback through the global Toaster.
 */

interface Props {
  value: string | null;
  placeholder?: string;
  multiline?: boolean;
  inputClassName?: string;
  displayClassName?: string;
  onSave: (next: string) => Promise<void> | void;
  formatDisplay?: (v: string | null) => string;
}

export function EditableField({
  value, placeholder = "—", multiline = false,
  inputClassName = "", displayClassName = "",
  onSave, formatDisplay,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [committedValue, setCommittedValue] = useState(value);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  // External value changes (e.g., server refetch) should resync the display.
  useEffect(() => { setCommittedValue(value); setDraft(value ?? ""); }, [value]);

  function commit() {
    const next = draft.trim();
    const previous = committedValue ?? "";
    if (next === previous) { setEditing(false); return; }
    setCommittedValue(next || null);
    setEditing(false);
    startTransition(async () => {
      try {
        await onSave(next);
        toast({ message: "Saved.", type: "success", duration: 1800 });
      } catch (e) {
        setCommittedValue(value); // revert
        toast({ message: e instanceof Error ? e.message : "Couldn't save", type: "error" });
      }
    });
  }

  function cancel() {
    setDraft(committedValue ?? "");
    setEditing(false);
  }

  if (editing) {
    const InputTag = multiline ? "textarea" : "input";
    return (
      <div className="inline-flex items-center gap-1 w-full">
        <InputTag
          ref={inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); cancel(); }
          }}
          placeholder={placeholder}
          className={`flex-1 min-w-0 rounded-md ring-1 ring-brand-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white ${inputClassName}`}
          {...(multiline ? { rows: 2 } : {})}
        />
        <button onMouseDown={(e) => { e.preventDefault(); commit(); }} className="text-emerald-600 hover:text-emerald-700 shrink-0" aria-label="Save">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onMouseDown={(e) => { e.preventDefault(); cancel(); }} className="text-rose-600 hover:text-rose-700 shrink-0" aria-label="Cancel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const display = formatDisplay ? formatDisplay(committedValue) : (committedValue ?? "");
  const isEmpty = !display;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`group inline-flex items-center gap-1 text-left rounded px-1 -mx-1 hover:bg-brand-100/40 transition ${displayClassName}`}
      title="Click to edit"
    >
      <span className={isEmpty ? "text-ink-400 italic" : ""}>{display || placeholder}</span>
      {pending
        ? <Loader2 className="h-3 w-3 animate-spin text-ink-400 shrink-0" />
        : <Pencil className="h-3 w-3 text-ink-300 opacity-0 group-hover:opacity-100 transition shrink-0" />}
    </button>
  );
}
