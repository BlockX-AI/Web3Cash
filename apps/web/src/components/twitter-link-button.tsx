'use client';

export function TwitterLinkButton({
  linkedHandle,
}: {
  linkedHandle: string | null;
}) {
  if (linkedHandle) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm">
        <span className="text-muted-foreground">Twitter:</span>
        <span className="font-mono text-foreground">@{linkedHandle}</span>
        <span className="text-green-600 dark:text-green-400">✓</span>
      </div>
    );
  }
  return (
    <a
      href="/api/oauth/twitter/start?returnTo=/dashboard"
      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Link Twitter
    </a>
  );
}
