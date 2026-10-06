type StatusMessageProps = {
  children: React.ReactNode;
  tone?: "success" | "error";
};

export function StatusMessage({ children, tone = "success" }: StatusMessageProps) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${className}`}>
      {children}
    </p>
  );
}
