# shadcn/ui Usage

- Check `components/ui/` before building any primitive (button, dialog, dropdown, table,
  form, etc.) — if shadcn already has it, use it, don't hand-roll a replacement.
- Missing a component? Run `npx shadcn@latest add <component>` rather than copy-pasting
  markup from memory — this keeps the local copy in sync with the project's theme tokens.
- Feature-specific composites (e.g. `TransactionTable`, `PostCard`, `KanbanColumn`) live in
  `components/[feature]/`, built on top of `components/ui/` primitives — they are not
  themselves shadcn primitives and shouldn't be added via the shadcn CLI.
- Respect the dark-mode-first theme — don't hardcode colors that only look right in light
  mode; use the Tailwind theme tokens already configured.
- Forms use shadcn's `Form` component (react-hook-form + zod) for anything with more than
  one field or that needs validation messages.
