import { useState, useEffect } from "react";
import { loadTableSettings, saveTableSettings } from "@/utils/tableSettings";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchable?: boolean;
  searchColumns?: { id: string; placeholder: string }[];
  paginated?: boolean;
  filters?: {
    id: string;
    label: string;
    options: { label: string; value: string | boolean }[];
  }[];
  onFilteredRowCountChange?: (count: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = false,
  searchColumns = [],
  paginated = false,
  filters,
  onFilteredRowCountChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "dateAdded",
      desc: true,
    },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: loadTableSettings().pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  useEffect(() => {
    if (onFilteredRowCountChange) {
      const filteredRows = table.getFilteredRowModel().rows;
      onFilteredRowCountChange(filteredRows.length);
    }
  }, [table, columnFilters, onFilteredRowCountChange]);

  return (
    <div className="w-full">
      <div className="space-y-4 py-4">
        {/* Search fields - responsive layout */}
        {searchable && searchColumns && searchColumns.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            {searchColumns.map((column) => (
              <Input
                key={column.id}
                placeholder={column.placeholder}
                value={(table.getColumn(column.id)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(column.id)?.setFilterValue(event.target.value)
                }
                className="w-full sm:max-w-[200px]"
              />
            ))}
          </div>
        )}
        
        {/* Filters - responsive layout */}
        {filters && filters.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {filters.map((filter) => (
              <div key={filter.id} className="flex-1 sm:flex-none min-w-0">
                <Select
                  value={(table.getColumn(filter.id)?.getFilterValue() as string)?.toString() || undefined}
                  onValueChange={(value) => {
                    if (value === "all") {
                      table.getColumn(filter.id)?.setFilterValue(undefined);
                    } else {
                      table.getColumn(filter.id)?.setFilterValue(
                        filter.options[0]?.value === true ? value === "true" : value
                      );
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все {filter.label.toLowerCase()}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value.toString()} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-md border w-full overflow-auto">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Нет данных
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {paginated && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 whitespace-nowrap">Записей на странице</span>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  const newPageSize = Number.parseInt(value);
                  table.setPageSize(newPageSize);
                  saveTableSettings({ pageSize: newPageSize });
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 30, 50, 100, 150, 200].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-gray-700 whitespace-nowrap">
              Страница {table.getState().pagination.pageIndex + 1} из{" "}
              {table.getPageCount()}
            </span>
          </div>
          <div className="flex items-center justify-center sm:justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-none"
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-none"
            >
              Вперед
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
