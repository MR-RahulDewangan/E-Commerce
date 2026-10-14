'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    setIsSubscribed(true);
  };

  return (
    <section
      aria-label="Newsletter Subscription"
      className="bg-card border border-border p-5 sm:p-12 lg:p-16 text-center max-w-4xl mx-auto space-y-5 sm:space-y-6"
    >
      <div className="space-y-3">
        <p className="text-[10px] sm:text-xs font-sans uppercase tracking-[0.2em] text-muted-foreground font-medium">
          Maison Gazette &bull; Private Previews
        </p>
        <h2 className="font-serif text-2xl sm:text-4xl font-medium tracking-tight text-foreground">
          Receive Private Invocations to Seasonal Drops
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Be first to inspect limited artisan releases, rare handloom weaves from Varanasi and Kashmir, and atelier chronicles. Unsubscribe at any time.
        </p>
      </div>

      {isSubscribed ? (
        <div className="p-4 bg-muted/60 border border-border inline-flex items-center gap-2 text-foreground text-xs uppercase tracking-wider font-sans">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
          <span>You are now subscribed to the Maison Gazette.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="newsletter-email" className="sr-only">
              Email Address
            </label>
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5 pointer-events-none" aria-hidden="true" />
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address..."
                className="w-full pl-10 pr-4 py-3 bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-sans uppercase tracking-widest font-medium transition cursor-pointer"
            >
              Subscribe
            </button>
          </div>
          {error && <p className="text-xs text-destructive text-left">{error}</p>}
          <p className="text-[10px] text-muted-foreground">
            We value your privacy. Your contact details remain confidential.
          </p>
        </form>
      )}
    </section>
  );
}
