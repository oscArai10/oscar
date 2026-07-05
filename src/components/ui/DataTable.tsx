import { cn } from "@/lib/utils/cn";

export interface DataTableColumn<T> {
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyFor: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyFor,
  emptyMessage = "No data yet.",
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-text-muted">{emptyMessage}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-neon">
          {columns.map((col) => (
            <th
              key={col.header}
              className={cn(
                "pb-3 text-xs font-medium uppercase tracking-wide text-text-muted",
                col.align === "right" && "text-right",
                col.align === "center" && "text-center",
              )}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={keyFor(row)} className="border-b border-white/5 last:border-none">
            {columns.map((col) => (
              <td
                key={col.header}
                className={cn(
                  "py-3 text-text-secondary",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                )}
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
