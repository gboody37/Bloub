# E2E Test Infra: Vibe Todos PDF Architecture

## Test Philosophy
- Opaque-box, requirement-driven.
- Verifies storage bucket creation, public URL access, frontmatter/database integrity, document rendering, and quiz execution.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | Supabase `media` Bucket & RLS | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 2 | Storage Verification Script | ORIGINAL_REQUEST §Acceptance | 5 | 5 | ✓ | ✓ |
| 3 | Direct Storage PDF Upload | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 4 | DB Base64 Migration & Size | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 5 | Visual PDF Document Viewer | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 6 | AI Quiz Side-by-Side Integration | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `scripts/verify-storage.js` and `scripts/run-e2e-tests.js`
- Test cases:
  - Tier 1: Storage bucket probe, public URL resolution, direct upload verification, database size check, viewer URL parsing.
  - Tier 2: Boundary cases (empty file, large file >10MB, special characters in filenames, corrupt PDF handling, missing frontmatter).
  - Tier 3: Cross-feature combinations (Upload -> DB Save -> Storage Download -> Viewer Render -> AI Quiz generation).
  - Tier 4: Real-world study workflow (Upload multi-page lecture PDF, open split viewer, take AI quiz while viewing document).
