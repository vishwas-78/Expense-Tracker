---
name: FinTrack integrations
description: Provider boundaries and workspace constraints for AI and payments.
---

FinTrack keeps AI and payment credentials server-side. The advisor currently uses a deterministic local analysis path, while payment providers remain an explicit future integration rather than a browser-exposed key.

**Why:** The workspace had no connected Supabase or Razorpay account, and managed Gemini setup was unavailable on the current plan. Local financial analysis gives users useful guidance without inventing an external model call or requiring a secret.

**How to apply:** Keep the advisor grounded in server-side, user-scoped ledger data. Before adding provider-dependent features, check workspace integrations and secrets, and preserve a useful local path when practical.