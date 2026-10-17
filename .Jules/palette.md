## 2024-05-14 - Add ARIA Labels to Icon-Only Delete Buttons
**Learning:** Icon-only buttons (like those using `lucide-react` icons e.g., `<Trash2 />`) frequently lack accessible names. Adding an `aria-label` attribute (e.g., `aria-label="Hapus item"`) significantly improves accessibility for screen readers. In this application, ARIA labels and UI text should be in Indonesian.
**Action:** When creating or modifying icon-only buttons, always ensure an appropriate `aria-label` is present in Indonesian to describe the button's action.
