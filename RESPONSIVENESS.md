# Mobile Responsiveness Guidelines

Paperless 2.0 uses a **mobile-first** philosophy powered by Tailwind CSS.

### 1. Global Navigation Architecture
The underlying `DashboardLayout` has been refitted with an intelligent collapsible Side Drawer.
- **Do not** write static width dimensions that exceed `< 350px` on root containers.
- If you build a new dashboard view, rely on the global layout wrapper padding, which automatically scales (`p-4 md:p-8`).

### 2. Standard Interface Breakpoints
Whenever building upcoming forms or tables, always default to a stacked column structure, and strictly use the `md:` modifier (min-width > 768px) to establish your desktop grids.
**Example — Responsive Action Bars:**
```tsx
// ❌ Static Desktop Flex (Breaks on Mobile)
<div className="flex items-center justify-between">...</div>

// ✅ Fluid Flex Wrapper
<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">...</div>
```

### 3. Data Flow & Tables (The Overflow Mandate)
Form inputs and historical databases can sometimes generate unpredictable text widths.
To ensure upcoming tables never shatter the mobile device boundaries:
- **Never rely on pure tables for full-screen setups on mobile.**
- Always wrap `<table>` tags inside an established overflow container:
```tsx
<div className="rounded-xl border border-gray-200 overflow-x-auto">
   <table className="w-full text-sm min-w-[350px]">
      {/* Table Content */}
   </table>
</div>
```

### 4. Text Truncation and Flex Sizing
Because dynamic variables (e.g. `user_email`, `reference_id`) run the risk of breaking parent width containers when viewed on standard `375px` phone screens, actively apply truncation to Flex children nodes:
- Add `min-w-0` to flex child structures to force browser-wrapping.
- Inject `truncate` mapping to heavy text. 
- Use the `hidden sm:block` trick to gracefully remove non-essential decorative vectors (like generic icons) off the screen when real-estate vanishes.
