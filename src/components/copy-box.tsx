"use client";

import { useState } from "react";

export default function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-ink p-3 pr-16 text-xs leading-relaxed whitespace-pre-wrap break-all text-white">
        {text}
      </pre>
      <button
        type="button"
        className="btn absolute top-2 right-2 bg-surface px-2.5 py-1 text-xs text-ink"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "✓" : "Kopyala"}
      </button>
    </div>
  );
}
