'use client';

export function TwitterLinkButton({
  linkedHandle,
}: {
  linkedHandle: string | null;
}) {
  if (linkedHandle) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-400">
          Twitter linked:{' '}
          <span className="font-mono text-neutral-200">@{linkedHandle}</span>
        </span>
      </div>
    );
  }
  return (
    <a
      href="/api/oauth/twitter/start"
      className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
    >
      Link Twitter
    </a>
  );
}
