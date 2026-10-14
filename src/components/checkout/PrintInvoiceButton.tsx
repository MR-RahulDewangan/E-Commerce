'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-xs text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition font-medium cursor-pointer"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Print Official Tax Invoice</span>
    </button>
  );
}
