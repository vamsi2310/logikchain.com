# Marketing Department: Social Media & Growth Campaigns

This directory contains version-controlled records of all marketing, advertising, influencer collaborations, and social acquisition campaigns for Logikchain.

## Structure & Conventions

- `campaigns.json`: Master index containing structured campaign records, budget/costs, estimated revenues, medium channels, targeting, and entry point URLs with standardized UTM parameters.
- `CAMPAIGN_REGISTRY.md`: Human-readable summary table and breakdown of all active, planned, and archived campaigns.
- `ads/`: Individual campaign records with full HTML content, copy variations, creative specifications, and attachment links.
- `attachments/`: Creative assets (banners, ad mocks, scripts, storyboards, creative briefs).

## Campaign Record Schema

Each ad campaign record includes:
1. **Ad Name / Campaign ID**: Unique campaign identifier and human-readable title.
2. **Medium / Channel**: Facebook Marketplace, YouTube, Instagram, Google Ads, Influencer Sponsorship, Creator Network, etc.
3. **Entry Points & Landing URLs**: Explicit destination route on the platform (e.g. `http://localhost:5173/download`, `http://localhost:5173/how-it-works`, `/merchants`, `/riders`, `/suppliers`, `/login?signup=true`).
4. **UTM Attribution**: Pre-constructed query parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `entry_point`, `creator_id`).
5. **Content in HTML**: Ready-to-deploy HTML templates for responsive ads, email newsletters, carousel ads, or video description rich text.
6. **Other Attachments**: Referenced media files, creative briefs, poster designs, and asset links in `marketing/attachments/`.
7. **Cost / Ad Spend**: Incurred or budgeted expense (₹ / INR or USD).
8. **Estimated Revenue Inflow**: Projected gross merchant value (GMV), platform fee commissions, or user lifetime value (LTV).
9. **Target Persona / Role**: Buyer, Rural Merchant (Kirana), Logistics Rider / Fleet, Supplier.

