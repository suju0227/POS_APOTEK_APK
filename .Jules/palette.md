## 2025-05-18 - Missing Accessibility Attributes on Form Array Icons
**Learning:** Icon-only action buttons (like Trash icons for removing rows in dynamic form arrays) are frequently missed in accessibility reviews, lacking both `aria-label` (for screen readers) and `title` (for sighted users hovering).
**Action:** When implementing or reviewing dynamic form arrays (like prescriptions or return items), explicitly check that row-level action buttons include descriptive `aria-label` and `title` attributes.
