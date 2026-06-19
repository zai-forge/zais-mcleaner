// Barra de progresso animada.
//   - determinada: largura controlada por `value` (0..1), com transição suave.
//   - indeterminada (value === undefined): faixa deslizante contínua, deixando
//     claro que o processo está ativo e não travou.

interface Props {
  value?: number; // 0..1; ausente => indeterminada
  className?: string;
}

export default function ProgressBar({ value, className = "" }: Props) {
  const indeterminate = value === undefined;
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/60 ${className}`}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 left-0 w-2/5 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-brand-500" />
      ) : (
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
