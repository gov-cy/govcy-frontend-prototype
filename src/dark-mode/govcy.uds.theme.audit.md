# GOV.CY UDS v3.3.0 colour cascade audit

> Experimental reference only. The generated CSS is a prototype overlay, not a production migration or accessibility approval.

## Inputs and limits

- Audited `/mnt/data/govcy.uds(2).css` (v3.3.0, full stylesheet).
- Semantic token values are from the live Figma Semantic Colours collection (78 variables).
- Reference CSS is additive and must load after the existing UDS CSS.
- Only selectors referring to GOV.CY components/utilities receive automated declaration overrides. Bootstrap/general selectors are analysed but intentionally not wholesale rewritten.
- Only literal CSS colours can be mapped automatically; gradients, embedded images, opacity, currentColor, and variable-derived colours need additional verification.

## Audit counts

- Top-level stylesheet rules: **2794**.
- Colour-bearing declarations (including Bootstrap custom-property definitions): **1195**.
- Declarations in selectors containing `govcy-`: **298**.
- Such GOVCY declarations marked `!important`: **94**.
- Other colour-bearing declarations marked `!important`: **97**.
- GOVCY colour declarations mapped to prototype overrides: **277**.
- GOVCY colour declarations not safely mapped: **9**.
- GOVCY declarations skipped as fixed/transparent/Bootstrap-derived: **12**.
- Figma semantic variables emitted: **78**; additional provisional CSS tokens: **18**.

## Critical findings

1. Existing `.govcy-bg-*`, `.govcy-text-*` and `.govcy-br-*` utility classes contain `!important` rules. The reference retains `!important` where the original uses it.
2. Existing `.govcy-text-primary` is brand blue, not the semantic body-text token; similar naming collisions exist for secondary and fixed-value utilities. These are treated as distinct prototype roles.
3. Bootstrap ships its own `[data-bs-theme=dark]` palette (`--bs-body-bg: #212529`). The reference bridges basic Bootstrap page/link/border tokens to UDS but leaves full Bootstrap component harmonization for migration.
4. CSS `background`, `border` shorthands, colour utilities and focus shadows need careful rule-by-rule review; automated matches are not proof of correct design semantics.
5. Figma has no dedicated `background/button-success` base token; provisional mapping holds existing Light value in Dark and is flagged.
6. CSS-only colour roles (info text/border, success text, muted dates, contextual table backgrounds) require Dark Mode contrast decisions.
7. Some interactive states use fixed white foreground on dark backgrounds; prototype preserves existing Light values but requires dark accessibility testing.
8. A CSS file can theme system and component colours but cannot implement preference persistence or early initialization; separate `GOVCY.Theme` JS is required.

## Unmapped colour declarations requiring review

The following is generated from the full stylesheet. Long selector lists are abbreviated for readability.

| Source line | Selector (abbreviated) | Declaration | Reason |
|---:|---|---|---|
| 18697 | `.govcy-bg-outer-space` | `background-color: rgb(71, 69, 69)` | no-approved-semantic-match: rgb(71, 69, 69) |
| 18709 | `.govcy-bg-main-shade-0` | `background-color: rgb(46, 82, 104)` | no-approved-semantic-match: rgb(46, 82, 104) |
| 18713 | `.govcy-bg-main-shade-1` | `background-color: rgb(204, 219, 226)` | no-approved-semantic-match: rgb(204, 219, 226) |
| 30547 | `.govcy-header .govcy-right-menu` | `box-shadow: -5px 6px 5px 0px rgba(0, 0, 0, 0.09)` | no-approved-semantic-match: rgba(0, 0, 0, 0.09) |
| 31327 | `.govcy-text-input:focus, .govcy-text-area:focus` | `box-shadow: 0 0 0 4pt #ffdd00` | no-approved-semantic-match: #ffdd00 |
| 31332 | `.govcy-text-input-error, .govcy-text-area-error` | `border-color: #d4351c` | no-approved-semantic-match: #d4351c |
| 32226 | `.govcy-tag-cyan` | `background-color: #487d93` | no-approved-semantic-match: #487d93 |
| 32571 | `.govcy-share .govcy-share__icon` | `color: #75767b` | no-approved-semantic-match: #75767b |
| 32586 | `.govcy-share .govcy-share__toast` | `box-shadow: rgba(0, 0, 0, 0.15) 0 8px 16px` | no-approved-semantic-match: rgba(0, 0, 0, 0.15) |

## Rules for production migration

- Integrate CSS variables into source SCSS/CSS rules instead of shipping a permanent large override layer.
- Keep Light Mode unchanged and run snapshot/visual regression comparison against v3.3.0.
- Preserve existing utility `!important` contract; do not add `!important` as a global theme-switching strategy.
- Confirm token purpose for each selector and colour; same literal hex does not prove same meaning.
- Review native controls, Bootstrap link and form variables, SVG data images, focus ring shadows, tables and status colours separately.
- Validate generated CSS with a real-browser test page including all UDS components and states, Chrome/Firefox/Safari and WCAG contrast.
- Prevent FOUC with early theme initialization in the HTML head; defaults remain Light with no saved preference.
- Ensure JS theme module coexists with generated UDS bundle reassigning global `GOVCY`.


## Second-pass audit — screenshot and test HTML (24 November 2026)

The first audit only iterated top-level CSS qualified rules. A recursive scan
through `@media` rules establishes **761 colour-bearing declarations**, of
which **617 contain GOV.CY selectors**, including **329 in media queries**.
There are **408 `!important` colour declarations involving GOV.CY selectors**
when nested breakpoints are counted (many of these are repeated responsive utility classes).
The original 277 mapped overrides are therefore **not a complete enumeration of
colour-related declarations**.

### Confirmed issues and corrections

| Source / element | Issue | New reference override |
|---|---|---|
| `.govcy-form .govcy-form-control .govcy-hint` | First pass merged shared hint/error selector and chose error semantic token for both | Explicit `--govcy-text-hint` |
| `.govcy-input-error-msg` | Must remain an error, distinct from hint text | `--govcy-text-error` |
| `.govcy-text-input-error, .govcy-text-area-error` | Unmapped by first pass | `--govcy-border-error` |
| `.govcy-step-indicator__segment--current .govcy-step-indicator__label` | First pass mapped current status to default | `--govcy-progress-current` |
| Step indicator segment bars (`::after`) | First pass used background-step-number for all states | Corresponding default/completed/current progress tokens |
| `.govcy-step-indicator__current-counter` in responsive media queries | Entire rules omitted by first scan | `--govcy-progress-current` for border and background, white text |
| Mobile navigation in `@media screen and (max-width: 767px)` | Nested original declarations omitted | Responsive navigation background/text/border overrides |

### Remaining review work

- Responsive breakpoint utility classes (particularly `govcy-bg-*`, `govcy-text-*`, `govcy-br-*`) may contain repeated `!important` declarations; test these explicitly rather than overriding all of Bootstrap indiscriminately.
- Embedded SVG/base64 assets, icons and footer imagery have not been migrated.
- High-specificity selectors with compound pseudo-classes need browser-computed-style verification.
- The generated rule mapper can assign the wrong semantic role even when a colour value looks plausible; verify all interactive states in the browser.
- **Do not treat syntax validation as visual, accessibility or regression validation.**

The updated reference CSS is a *corrected second-pass prototype*, not a proven exhaustive production migration.

## Third-pass cascade adjustment — mobile menu

The browser test identified mobile navigation menu link colours that were still
overridden by UDS v3.3.0 `color: #474545 !important` declarations.
The experimental reference now adds `!important` to **theme-specific colour
declarations** that consume `--govcy-*` tokens (not the tokens themselves) and
adds explicit mobile default/hover/focus colour rules. The focus state retains
dark text over the existing yellow focus highlight.

This is intentional for the **standalone prototype overlay only**; the
production implementation should change source declarations in place and
preserve only existing utilities' `!important` cascade contract.
