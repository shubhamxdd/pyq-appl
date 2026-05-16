# UI Context

## Theme

The application supports both **Light and Dark modes**. 
- The user can toggle between themes manually.
- The default theme is determined by the user's system preference.
- The UI should remain clean and "academic," prioritizing readability of long-form text and questions.

## Colors

| Role | CSS Variable | Light Value | Dark Value |
| --- | --- | --- | --- |
| Page background | `--bg-base` | `#ffffff` | `#0f172a` |
| Surface | `--bg-surface` | `#f9fafb` | `#1e293b` |
| Primary text | `--text-primary` | `#111827` | `#f8fafc` |
| Muted text | `--text-muted` | `#6b7280` | `#94a3b8` |
| Primary accent | `--accent-primary` | `#2563eb` | `#3b82f6` |
| Border | `--border-default` | `#e5e7eb` | `#334155` |
| Error | `--state-error` | `#ef4444` | `#f87171` |
| Success | `--state-success` | `#10b981` | `#34d399` |

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| UI text | Inter / Sans-serif | `--font-sans` |
| Code/mono | JetBrains Mono / Fira Code | `--font-mono` |

## Border Radius

| Context | Class |
| --- | --- |
| Inline / small UI | `rounded-md` |
| Cards / panels | `rounded-lg` |
| Modals / overlays | `rounded-xl` |

## Component Library

- **TailwindCSS** with `dark:` variants.
- **shadcn/ui** or **Radix UI** primitives for accessible, themeable components.
- Icons: **Lucide React**.

## Layout Patterns

- **Standard Dashboard**: Left navigation, main content area.
- **Dual Pane Solver**: Question input and scrollable context/answer area.
- **Responsive Design**: Mobile-friendly sidebar (hamburger menu on small screens).

## Icons

- `Sun` / `Moon`: Theme toggling
- `FileText`: Resources
- `Zap`: Solver
- `FileEdit`: Generator
- `Download`: Export
