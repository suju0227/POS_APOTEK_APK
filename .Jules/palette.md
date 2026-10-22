## 2024-05-18 - Form Validation Accessibility
**Learning:** Reusable form components like 'Input' often lack proper ARIA linkages for validation errors out of the box. Adding 'aria-invalid' and linking error messages with 'aria-errormessage' dynamically based on component IDs is a high-leverage way to improve a11y across an entire application.
**Action:** When auditing or creating custom form inputs, ensure error states are programmatically linked to the input field, not just visually displayed nearby.
