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
- State classes use `is-`/`has-` prefixes: `&.is-open`, `&.is-selected`, `&.has-preview`
- A component styles its inside; the parent positions it. No `margin` on a root class, use `gap` on the parent
- Namespace `@keyframes` with the component prefix: `toast-slide-up`, not `fade-in`
- Conditional classes using template literals
- Minimal inline styles, prefer CSS classes
- Keep these at zero: `!important`, ID selectors, `rem`/`em` outside `index.css`, tabs
