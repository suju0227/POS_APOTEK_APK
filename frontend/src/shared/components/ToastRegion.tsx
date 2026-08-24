import { useToastStore } from './toast.store';

export function ToastRegion() {
  const message = useToastStore((state) => state.message);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  );
}
