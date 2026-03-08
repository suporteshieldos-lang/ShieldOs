import { SearchInput } from "./SearchInput";
import { PrimaryButton } from "./PrimaryButton";

type PageHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateCustomer: () => void;
};

export function PageHeader({ search, onSearchChange, onCreateCustomer }: PageHeaderProps) {
  return (
    <header>
      <div className="mb-4 mt-0 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="w-full flex-1">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar cliente por nome, telefone ou CPF..." />
        </div>

        <div className="w-full md:w-auto">
          <PrimaryButton onClick={onCreateCustomer} className="w-full md:w-auto">
            + Novo Cliente
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}
