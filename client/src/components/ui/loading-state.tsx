import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
