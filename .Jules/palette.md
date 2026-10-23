## 2024-10-23 - Add Required Field Indicator
**Learning:** Users need visual cues to quickly identify mandatory fields in forms, improving usability and accessibility.
**Action:** Added a red asterisk `*` next to the label of required fields in the `Input` component, with `aria-hidden="true"` to prevent redundant screen reader announcements (as the `required` attribute on the input itself is already announced).
