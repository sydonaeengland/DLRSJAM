export default function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 flex items-start gap-2">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}