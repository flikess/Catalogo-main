import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Column {
  key: string
  label: string
  className?: string
  render?: (value: any, row: any) => React.ReactNode
  mobileLabel?: string
  hideOnMobile?: boolean
}

interface ResponsiveTableProps {
  data: any[]
  columns: Column[]
  onRowClick?: (row: any) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  onRowClick,
  loading,
  emptyMessage = 'Nenhum item encontrado',
  className
}) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                key={index}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <Card 
            key={index}
            className={cn(
              "p-4",
              onRowClick && "cursor-pointer hover:shadow-md transition-shadow"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-0 space-y-3">
              {columns
                .filter(column => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">
                      {column.mobileLabel || column.label}:
                    </span>
                    <div className="text-sm font-medium text-right ml-2 min-w-0 flex-1">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

// Hook para facilitar o uso
export const useResponsiveTable = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return { isMobile }
}