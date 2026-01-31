import { createContext, useContext, useEffect, useState } from 'react'

interface ColorPalette {
  id: string
  name: string
  primary: string
  primaryForeground: string
  secondary: string
  accent: string
  background: string
  foreground: string
  muted: string
  border: string
  ring: string
  sidebar: string
  sidebarForeground: string
  sidebarPrimary: string
  sidebarAccent: string
}

const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Azul Clássico',
    primary: '222.2 47.4% 11.2%',
    primaryForeground: '210 40% 98%',
    secondary: '210 40% 96.1%',
    accent: '210 40% 96.1%',
    background: '0 0% 100%',
    foreground: '222.2 84% 4.9%',
    muted: '210 40% 96.1%',
    border: '214.3 31.8% 91.4%',
    ring: '222.2 84% 4.9%',
    sidebar: '0 0% 98%',
    sidebarForeground: '240 5.3% 26.1%',
    sidebarPrimary: '240 5.9% 10%',
    sidebarAccent: '240 4.8% 95.9%'
  },
  {
    id: 'pink',
    name: 'Rosa Confeitaria',
    primary: '330 81% 60%',
    primaryForeground: '0 0% 100%',
    secondary: '330 40% 96%',
    accent: '330 40% 96%',
    background: '0 0% 100%',
    foreground: '330 81% 15%',
    muted: '330 40% 96%',
    border: '330 31% 91%',
    ring: '330 81% 60%',
    sidebar: '330 40% 98%',
    sidebarForeground: '330 81% 25%',
    sidebarPrimary: '330 81% 60%',
    sidebarAccent: '330 40% 95%'
  },
  {
    id: 'purple',
    name: 'Roxo Elegante',
    primary: '262 83% 58%',
    primaryForeground: '0 0% 100%',
    secondary: '262 40% 96%',
    accent: '262 40% 96%',
    background: '0 0% 100%',
    foreground: '262 83% 15%',
    muted: '262 40% 96%',
    border: '262 31% 91%',
    ring: '262 83% 58%',
    sidebar: '262 40% 98%',
    sidebarForeground: '262 83% 25%',
    sidebarPrimary: '262 83% 58%',
    sidebarAccent: '262 40% 95%'
  },
  {
    id: 'green',
    name: 'Verde Natural',
    primary: '142 76% 36%',
    primaryForeground: '0 0% 100%',
    secondary: '142 40% 96%',
    accent: '142 40% 96%',
    background: '0 0% 100%',
    foreground: '142 76% 15%',
    muted: '142 40% 96%',
    border: '142 31% 91%',
    ring: '142 76% 36%',
    sidebar: '142 40% 98%',
    sidebarForeground: '142 76% 25%',
    sidebarPrimary: '142 76% 36%',
    sidebarAccent: '142 40% 95%'
  },
  {
    id: 'orange',
    name: 'Laranja Caramelo',
    primary: '25 95% 53%',
    primaryForeground: '0 0% 100%',
    secondary: '25 40% 96%',
    accent: '25 40% 96%',
    background: '0 0% 100%',
    foreground: '25 95% 15%',
    muted: '25 40% 96%',
    border: '25 31% 91%',
    ring: '25 95% 53%',
    sidebar: '25 40% 98%',
    sidebarForeground: '25 95% 25%',
    sidebarPrimary: '25 95% 53%',
    sidebarAccent: '25 40% 95%'
  },
  {
    id: 'brown',
    name: 'Marrom Chocolate',
    primary: '30 67% 25%',
    primaryForeground: '0 0% 100%',
    secondary: '30 40% 96%',
    accent: '30 40% 96%',
    background: '0 0% 100%',
    foreground: '30 67% 15%',
    muted: '30 40% 96%',
    border: '30 31% 91%',
    ring: '30 67% 25%',
    sidebar: '30 40% 98%',
    sidebarForeground: '30 67% 20%',
    sidebarPrimary: '30 67% 25%',
    sidebarAccent: '30 40% 95%'
  }
]

interface ThemeContextType {
  currentPalette: ColorPalette
  palettes: ColorPalette[]
  changePalette: (paletteId: string) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentPalette, setCurrentPalette] = useState<ColorPalette>(colorPalettes[0])

  useEffect(() => {
    // Carregar paleta salva do localStorage
    const savedPaletteId = localStorage.getItem('confeitaria-pro-palette')
    if (savedPaletteId) {
      const savedPalette = colorPalettes.find(p => p.id === savedPaletteId)
      if (savedPalette) {
        setCurrentPalette(savedPalette)
      }
    }
  }, [])

  useEffect(() => {
    // Aplicar as cores CSS
    const root = document.documentElement
    
    root.style.setProperty('--primary', currentPalette.primary)
    root.style.setProperty('--primary-foreground', currentPalette.primaryForeground)
    root.style.setProperty('--secondary', currentPalette.secondary)
    root.style.setProperty('--accent', currentPalette.accent)
    root.style.setProperty('--background', currentPalette.background)
    root.style.setProperty('--foreground', currentPalette.foreground)
    root.style.setProperty('--muted', currentPalette.muted)
    root.style.setProperty('--border', currentPalette.border)
    root.style.setProperty('--ring', currentPalette.ring)
    root.style.setProperty('--sidebar-background', currentPalette.sidebar)
    root.style.setProperty('--sidebar-foreground', currentPalette.sidebarForeground)
    root.style.setProperty('--sidebar-primary', currentPalette.sidebarPrimary)
    root.style.setProperty('--sidebar-accent', currentPalette.sidebarAccent)
  }, [currentPalette])

  const changePalette = (paletteId: string) => {
    const palette = colorPalettes.find(p => p.id === paletteId)
    if (palette) {
      setCurrentPalette(palette)
      localStorage.setItem('confeitaria-pro-palette', paletteId)
    }
  }

  return (
    <ThemeContext.Provider value={{ currentPalette, palettes: colorPalettes, changePalette }}>
      {children}
    </ThemeContext.Provider>
  )
}