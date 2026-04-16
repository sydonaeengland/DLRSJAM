export default function AuthField({ label, right, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600">{label}</label>
        {right && <span>{right}</span>}
      </div>
      {children}
    </div>
  );
}