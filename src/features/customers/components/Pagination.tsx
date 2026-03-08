type PaginationProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, totalPages, pageSize, totalItems, onPageChange }: PaginationProps) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalPages <= 1 && totalItems === 0) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#6B7280]">
        Mostrando {start}-{end} de {totalItems} clientes
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              p === page ? "bg-[#2563EB] text-white" : "border border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]"
            }`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#111827] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próximo
        </button>
      </div>
    </div>
  );
}
