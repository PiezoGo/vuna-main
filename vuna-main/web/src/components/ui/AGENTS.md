# src/components/ui — design system

Reusable primitives: Button, Input, Label, Select, Textarea, Card, Badge, Dialog, Sheet, Tabs, Toast, Skeleton, Avatar, DropdownMenu, Tooltip…

- Add primitives with the shadcn CLI (`pnpm dlx shadcn@latest add <name>`), then restyle using theme tokens (`bg-primary`, `text-muted-foreground`). Never hard-code hex colours.
- Variants use `cva`; class merging uses `cn()` from `@/lib/utils`.
- No business logic, no API calls, no VUNA words (no "order", "farmer"). If it knows about the domain, it belongs in `components/<feature>/`.
- Every interactive primitive must be keyboard-accessible and show a visible focus ring.
