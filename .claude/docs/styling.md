# Styling Guidelines

Plain CSS with custom properties for theming. **Read `assets/index.css` first**, it is the full list of design tokens (colors, spacing, typography, shadows, z-index, transitions) and the source of truth for their values. Never hardcode a value that an existing token already covers.

## CSS Classes
- One component, one stylesheet, one root class named after the component: `.empty-state`
- Flat, kebab-case names prefixed with the root class: `.empty-state-title` (not BEM `__`/`--`)
- 2-space indentation
- Use CSS nesting with `&` for modifiers and pseudo-elements: `&.is-open`, `&:hover`, `&::before`
- Child classes and elements nested directly without `&`: `.child-class`, `svg`
- Nest all child/descendant selectors under their parent instead of declaring them flat at the top level. Only declare a new top-level selector for a class that is a genuinely separate component, not a child of an existing one
- Nest at most 4 levels deep; extract a sub-component past that
- State classes use `is-`/`has-` prefixes: `&.is-open`, `&.is-selected`, `&.has-preview`. Variants (`&.primary`, `&.danger`, `&.error`), layout modes (`&.right-aligned`) and identities (`&.pick`, `&.rejected`) aren't states and stay unprefixed
- A component styles its inside; the parent positions it. No `margin` on a root class, use `gap` on the parent
- Namespace `@keyframes` with the component prefix: `toast-slide-up`, not `fade-in`
- Conditional classes using template literals
- Minimal inline styles, prefer CSS classes
- Keep these at zero: `!important`, ID selectors, `rem`/`em` outside `index.css`, tabs

## Design Tokens
Non-obvious rules the token list does not tell you:

- Typography goes through the `font` shorthand, never a bare `font-size`/`line-height`. The shorthand **resets** `font-weight`, `line-height` and `font-family`, so put any of those AFTER it, never before. Declaring `font-family` alone is fine when a block should change family but inherit its size
- Colors: no hex/rgb/named literals. Exception: a color that must stay constant regardless of theme (white text on a permanently dark overlay)
- For a translucent variant of a token color use relative color syntax: `rgb(from var(--yellow-400) r g b / 0.1)`, not a hardcoded rgba
- Use `50%` for circles, not `--radius-full`. `50%` follows the aspect ratio and stays correct if the element is not square
- z-index layers are semantic: `--z-base` for sticky headers and dropdowns, `--z-overlay` for modals, lightbox, compare mode, filter panel and toasts
- No `rem`/`em` outside `assets/index.css`; use `px` for one-off sizes no token covers
