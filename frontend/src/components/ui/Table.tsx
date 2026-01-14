import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

function Table<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className={`text-center py-12 text-text-secondary ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        <thead className="bg-background-secondary sticky top-0 z-10">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-sm font-semibold text-text-primary border-b border-border-default ${
                  column.className || ''
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`border-b border-border-default transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-background-secondary' : ''
              }`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-text-primary ${column.className || ''}`}
                >
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;

