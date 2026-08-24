# Codex Skills - POS Apotek

## 1. Tujuan

Dokumen ini mencatat adaptasi konsep dari katalog `openai/skills` ke workflow POS Apotek. Skill eksternal tidak disalin mentah-mentah; repo ini memakai skill lokal yang tunduk pada `AGENTS.md`, PRD, SRS, SDD, dan guardrail V1.

## 2. Hasil Analisis `openai/skills`

`openai/skills` adalah katalog folder instruksi, referensi, script, dan asset untuk membuat workflow Codex berulang. Skill yang paling relevan untuk POS Apotek:

| Skill publik | Relevansi | Keputusan |
|---|---|---|
| `security-best-practices` | Cocok untuk menjaga auth, RBAC, sanitasi response kasir, dan secure-by-default TypeScript/NestJS. | Diadaptasi sebagai guardrail keamanan pada skill lokal implementasi. |
| `security-threat-model` | Cocok untuk sesi threat model POS: asset stok, transaksi, laba, token, audit log, dan backup. | Dipakai sebagai referensi pola untuk sesi security/testing nanti. |
| `playwright` | Cocok untuk smoke test UI real browser saat sesi testing. | Diadaptasi sebagai bagian skill testing, tanpa menambah test besar ke sesi implementasi. |
| `gh-address-comments` dan `yeet` | Cocok untuk workflow GitHub review, commit, push, dan PR. | Dipakai sebagai referensi proses, tetapi tetap mengikuti instruksi git lokal dan approval sandbox. |
| Skill deploy cloud (`vercel-deploy`, `netlify-deploy`, `cloudflare-deploy`, `render-deploy`) | Tidak cocok sebagai default V1 karena target utama proyek adalah Docker Full Local Mode. | Tidak diaktifkan sebagai baseline proyek. |

## 3. Skill Lokal yang Ditambahkan

| Skill lokal | Lokasi | Kegunaan |
|---|---|---|
| `pos-apotek-v1-implementation` | `.codex/skills/pos-apotek-v1-implementation` | Dipakai saat implementasi fitur V1, terutama stock/batch/FEFO/sales/purchase/return/report/users/settings/audit-log. |
| `pos-apotek-testing-safety` | `.codex/skills/pos-apotek-testing-safety` | Dipakai saat sesi testing, smoke manual, role security, Docker local validation, dan backup/restore. |

Referensi publik yang setara tersedia untuk pembaca repo di:

- `docs/business-rules.md`
- `docs/frontend-patterns.md`
- `docs/local-deployment.md`
- `docs/test-matrix.md`

## 4. Aturan Prioritas

1. `AGENTS.md` dan dokumen PRD/SRS/SDD tetap menjadi otoritas proyek.
2. Skill lokal hanya mempercepat workflow dan mengingat guardrail.
3. Skill eksternal tidak boleh mengubah scope V1.
4. Docker Full Local Mode tetap target deployment utama V1.
5. Test besar tetap dilakukan pada sesi testing khusus, bukan sesi implementasi harian.
