import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/contexts/ThemeContext'

export const ThemeSelector = () => {
  const { currentPalette, palettes, changePalette } = useTheme()

  const getColorPreview = (palette: any) => {
    const hsl = palette.primary.split(' ')
    const h = hsl[0]
    const s = hsl[1]
    const l = hsl[2]
    return `hsl(${h}, ${s}, ${l})`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700">
          Paleta de Cores
        </div>
        {palettes.map((palette) => (
          <DropdownMenuItem
            key={palette.id}
            onClick={() => changePalette(palette.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div 
              className="w-4 h-4 rounded-full border border-gray-200"
              style={{ backgroundColor: getColorPreview(palette) }}
            />
            <span className={currentPalette.id === palette.id ? 'font-medium' : ''}>
              {palette.name}
            </span>
            {currentPalette.id === palette.id && (
              <div className="ml-auto w-2 h-2 bg-current rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}