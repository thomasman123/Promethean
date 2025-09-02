# Promethean Design System

## Core Principles
- **Minimal & Clean**: No unnecessary borders or shadows
- **Subtle Glassmorphism**: Light backdrop blur effects
- **Monochromatic**: Primarily zinc/gray scale with blue accents
- **Rounded Elements**: Consistent border radius throughout
- **Smooth Transitions**: All interactive elements have transitions

## Color Palette

### Light Mode
- **Background**: `bg-white/50` (semi-transparent white)
- **Surface**: `bg-zinc-100/90` (light gray with opacity)
- **Surface Hover**: `bg-zinc-200/90`
- **Text Primary**: `text-zinc-900`
- **Text Secondary**: `text-zinc-600`
- **Text Muted**: `text-zinc-400`
- **Borders**: `border-zinc-200/50` (semi-transparent)

### Dark Mode
- **Background**: `bg-black/50` (semi-transparent black)
- **Surface**: `bg-zinc-900/90` (dark gray with opacity)
- **Surface Hover**: `bg-zinc-800/90`
- **Text Primary**: `text-white`
- **Text Secondary**: `text-zinc-400`
- **Text Muted**: `text-zinc-500`
- **Borders**: `border-zinc-800/50` (semi-transparent)

### Accent Colors
- **Primary**: Blue (`bg-blue-600`, `text-blue-600`)
- **Success**: Green (`bg-green-600`, `text-green-400`)
- **Error**: Red (`bg-red-600`, `text-red-400`)

## Typography
- **Headings**: `font-bold` with appropriate sizes
- **Body**: Default font weight
- **Small Text**: `text-sm` or `text-xs` for secondary content

## Components

### Buttons
```css
/* Primary Button */
.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700 
         px-4 py-2 rounded-full font-medium text-sm
         transition-all duration-200;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-zinc-100/90 dark:bg-zinc-900/90 
         text-zinc-900 dark:text-white
         hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90
         px-4 py-2 rounded-full font-medium text-sm
         backdrop-blur-sm transition-all;
}
```

### Cards/Surfaces
- **Background**: `bg-zinc-100/90 dark:bg-zinc-900/90`
- **Border Radius**: `rounded-2xl` or `rounded-3xl` for modals
- **No borders or shadows** on regular cards
- **Backdrop Blur**: `backdrop-blur-sm` for subtle glass effect

### Modals
- **Backdrop**: `bg-black/20 dark:bg-black/40 backdrop-blur-sm`
- **Modal Container**: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl`
- **Border**: `border border-zinc-200/50 dark:border-zinc-800/50`
- **Shadow**: `shadow-2xl` (only for modals)
- **Radius**: `rounded-3xl`

### Forms
- **Input Background**: `bg-white dark:bg-zinc-800`
- **Input Border**: `border-zinc-300 dark:border-zinc-600`
- **Focus State**: `focus:ring-2 focus:ring-blue-500`
- **Radius**: `rounded-lg`

### Layout
- **Page Background**: `bg-white/50 dark:bg-black/50 backdrop-blur-sm`
- **Content Padding**: `pl-20 pr-8 pt-20 pb-8` (accounting for sidebar)
- **Section Spacing**: `mb-6` between major sections

## Interaction States
- **Hover**: Slightly darker/lighter background with smooth transition
- **Active**: Blue accent color
- **Disabled**: Reduced opacity with `cursor-not-allowed`
- **Loading**: Spinner with `animate-spin`

## Special Effects
- **No drop shadows** on regular elements
- **No borders** on cards/widgets
- **Subtle transitions**: `transition-all duration-200`
- **Backdrop blur** for depth without shadows

## Examples

### Standard Card
```jsx
<div className="bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl p-4">
  {/* Content */}
</div>
```

### Interactive Button
```jsx
<button className="bg-zinc-100/90 dark:bg-zinc-900/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 px-4 py-2 rounded-full text-sm font-medium text-zinc-900 dark:text-white backdrop-blur-sm transition-all">
  Button Text
</button>
```

### Modal Structure
```jsx
<div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40">
  <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50">
    {/* Modal content */}
  </div>
</div>
``` 