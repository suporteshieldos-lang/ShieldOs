import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type TableActionsDropdownProps = {
  onView: () => void;
  onEdit: () => void;
  onNewOrder: () => void;
  onHistory: () => void;
};

export function TableActionsDropdown({ onView, onEdit, onNewOrder, onHistory }: TableActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md border border-transparent hover:border-[#E5E7EB] hover:bg-[#F9FAFB]">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>Ver cliente</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>Editar cliente</DropdownMenuItem>
        <DropdownMenuItem onClick={onNewOrder}>Nova ordem de serviço</DropdownMenuItem>
        <DropdownMenuItem onClick={onHistory}>Histórico</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
