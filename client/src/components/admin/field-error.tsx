import { AlertCircle } from "lucide-react";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive flex items-start gap-1.5 mt-1.5" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

export function FormErrorSummary({ errors }: { errors: Record<string, string> }) {
  const messages = Object.entries(errors).filter(([k]) => k !== "_form").map(([, v]) => v);
  const formMsg = errors._form;
  const all = formMsg ? [formMsg, ...messages] : messages;
  if (!all.length) return null;
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      <p className="font-medium mb-1">Please fix the following:</p>
      <ul className="list-disc list-inside space-y-0.5">
        {all.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
