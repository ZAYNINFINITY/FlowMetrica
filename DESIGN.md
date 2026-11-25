# FlowMetrica design brief

- **Product job:** Ek naya user 60 second me samajh sake ki ye app kya hai, linear algebra kahan aati hai, MATLAB kyun hai, aur numbers ki provenance kya hai.
- **Audience and context:** CS student / junior-dev reviewer, laptop ya phone par, portfolio ya demo ke context me — confused nahi, cross-check karne ke mood me.
- **One memorable idea:** "Scenario → Ax = b → RREF → Answer + provenance" ek hi unbroken raye me dikhega; baaki sab usi raye ki explanation hai.
- **Tone:** precise, calm, technical. Must NOT resemble: marketing landing page, generic AI dashboard, feature-grid brochure.
- **Density:** utilitarian-dense with spacious breathing breaks. Data/scannable first, marketing nahi.
- **Canonical place:** `#/overview` ("How it works") sidebar me; Dashboard par sirf ek chota "Start here" link.
- **Type roles:** display = self-hosted Space Grotesk (headings only); body = Inter; metadata/equations/IDs = JetBrains Mono. Fluid display scale token ke through.
- **Palette:** existing fixed tokens (`base`, `panel`, `raised`, `line`, `accent`, `ink`, `muted`); koi naya hex component me nahi.
- **Motion:** CSS-only staggered reveal — eyebrow → title → lede → numbered flow (60–300ms) — plus a 200ms page fade. No JS animation library. `prefers-reduced-motion` aur `data-motion='reduced'` duration aur delay dono ko zero karte hain.
- **Honesty guardrail:** koi "Live MATLAB" ya "AI service" claim nahi. MATLAB = saved fixture; AI = external ChatGPT→MATLAB handoff.
- **Success check:** 360/768/1280 par ek focal flow, clear reading order, zero console errors, zero nonfunctional controls.
