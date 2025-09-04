# Promethean Design System

## Core Design Principles

### 1. **Pill-Shaped Components**
All interactive elements use rounded-full (pill-shaped) design for consistency.

### 2. **Subtle Backgrounds**
- Primary containers: `bg-muted/50 backdrop-blur-sm border border-border/50`
- Hover states: `hover:bg-muted/80` or `hover:bg-accent/50`
- Active states: `bg-primary text-primary-foreground shadow-sm`

### 3. **Consistent Spacing**
- Small gaps: `gap-1` or `gap-2`
- Medium gaps: `gap-3` or `gap-4`
- Padding: `p-2` for icons, `px-3 py-1.5` for text elements

### 4. **Animation & Transitions**
- All transitions: `transition-all duration-200`
- Dropdown animations: `animate-in fade-in-0 zoom-in-95 duration-200`
- Hover delays: 200ms to show, 100ms to hide

## Component Primitives

### Navigation Bar
```tsx
// Top navigation container
<div className={cn(
  "fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-200",
  isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent"
)}>
```

### Pill Container (Navigation Group)
```tsx
<div className={cn(
  "flex items-center gap-2 px-2 py-1 rounded-full",
  "bg-muted/50 backdrop-blur-sm border border-border/50"
)}>
```

### Icon Button
```tsx
<button className={cn(
  "flex items-center justify-center p-2 rounded-full transition-all duration-200",
  "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
  isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
)}>
  <Icon className="h-4 w-4" />
</button>
```

### Dropdown Select (Account Selector)
```tsx
<Select defaultValue="value">
  <SelectTrigger className={cn(
    "w-[200px] h-10 px-4 rounded-full",
    "bg-muted/50 backdrop-blur-sm border border-border/50",
    "hover:bg-muted/80 transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-primary/20"
  )}>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-sm">
    <SelectItem value="value1" className="rounded-xl focus:bg-accent">
      Option 1
    </SelectItem>
  </SelectContent>
</Select>
```

### Horizontal Dropdown Menu
```tsx
<div className={cn(
  "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50",
  "rounded-full border bg-popover/95 backdrop-blur-sm shadow-lg",
  "animate-in fade-in-0 zoom-in-95 duration-200"
)}>
  <div className="flex items-center gap-1 px-1 py-1">
    {items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors whitespace-nowrap"
      >
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span>{item.label}</span>
      </Link>
    ))}
  </div>
</div>
```

### Avatar with Border
```tsx
<Avatar className="h-9 w-9 border border-border/50">
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback className="bg-muted">U</AvatarFallback>
</Avatar>
```

### Dark Mode Toggle
```tsx
<button
  onClick={toggleDarkMode}
  className={cn(
    "rounded-full p-2.5 transition-all duration-200",
    "bg-muted/50 backdrop-blur-sm border border-border/50",
    "hover:bg-muted/80",
    "focus:outline-none focus:ring-2 focus:ring-primary/20"
  )}
>
  {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</button>
```

### Button Component (Updated)
```tsx
// In button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

## Color Palette Usage

### Backgrounds
- `bg-muted/50` - Primary container background
- `bg-popover/95` - Dropdown/popover background
- `bg-background/80` - Scrolled navbar background
- `bg-primary` - Active state background
- `bg-accent` - Hover state background

### Borders
- `border-border/50` - Subtle borders
- `border` - Standard borders

### Text
- `text-primary` - Primary text/icons
- `text-muted-foreground` - Secondary text/icons
- `text-primary-foreground` - Text on primary background

## Layout Patterns

### Page Layout
```tsx
<div className="min-h-screen bg-background">
  <TopBar />
  <main className="pt-16 p-6">
    {/* Page content */}
  </main>
</div>
```

### Hover Interaction Pattern
```tsx
const [openDropdown, setOpenDropdown] = useState<string | null>(null)
const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)

const handleMouseEnter = (itemId: string) => {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  const timeout = setTimeout(() => {
    setOpenDropdown(itemId)
  }, 200) // 200ms delay
  setHoverTimeout(timeout)
}

const handleMouseLeave = () => {
  if (hoverTimeout) clearTimeout(hoverTimeout)
  const timeout = setTimeout(() => {
    setOpenDropdown(null)
  }, 100) // 100ms delay
  setHoverTimeout(timeout)
}
```

## Global CSS Overrides
```css
/* Pill-shaped component overrides */
[data-radix-popper-content-wrapper] {
  @apply !rounded-2xl;
}

[role="menuitem"] {
  @apply !rounded-xl;
}

[role="option"] {
  @apply !rounded-xl;
}
```

## Icon Sizes
- Navigation icons: `h-4 w-4`
- Dropdown icons: `h-3 w-3`
- Logo: `h-6 w-6`
- Dark mode toggle: `h-4 w-4`

## Spacing Guidelines
- Navigation pill internal: `gap-2 px-2 py-1`
- Icon button padding: `p-2`
- Dropdown item padding: `px-3 py-1.5`
- Page content padding: `pt-16 p-6`

## Focus States
All interactive elements include:
```
focus:outline-none focus:ring-2 focus:ring-primary/20
```

## Dark Mode Implementation
```tsx
useEffect(() => {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    setIsDarkMode(true)
    document.documentElement.classList.add('dark')
  }
}, [])

const toggleDarkMode = () => {
  const newMode = !isDarkMode
  setIsDarkMode(newMode)
  
  if (newMode) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}
``` 