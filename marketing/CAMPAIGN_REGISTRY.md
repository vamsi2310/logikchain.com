# Marketing Campaigns Registry & Social Media Records

This registry tracks all version-controlled advertising, social media promotions, creator collaborations, and acquisition entry points for **Logikchain**.

---

## 1. Summary of Active Campaigns

| Campaign ID | Ad Name | Medium(s) | Target Role | Primary Entry Point | Cost (Budget) | Est. Revenue Inflow | ROI Multiple | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CAMP-FB-MKT-001`** | Kirana Merchant Direct Supply Sourcing | Facebook Marketplace, FB Feed | Merchant (Kirana) | [`/merchants`](http://localhost:5173/merchants) | ₹45,000 | ₹1,250,000 GMV (₹62.5k fee) | 2.78x | Active |
| **`CAMP-YT-INF-002`** | Corridor Deep-Dive Review | YouTube Video Sponsor, Shorts | General Onboarding | [`/how-it-works`](http://localhost:5173/how-it-works) | ₹75,000 | ₹2,100,000 GMV (₹105k fee) | 2.40x | Active |
| **`CAMP-IG-REEL-003`** | Fleet Rider Instant Payouts Reel | Instagram Reels, Stories | Rider / Driver | [`/riders`](http://localhost:5173/riders) | ₹30,000 | ₹980,000 GMV (₹49k fee) | 2.63x | Active |
| **`CAMP-GG-SEARCH-004`** | Wholesale FMCG/Agro Sourcing | Google Search, Performance Max | Supplier / Mill | [`/suppliers`](http://localhost:5173/suppliers) | ₹60,000 | ₹3,500,000 GMV (₹175k fee) | 3.91x | Active |
| **`CAMP-APP-DOWNLOAD-005`**| Consumer Quick Ordering App Promo | Instagram Feed, Google App Ads | Buyer (Consumer) | [`/download`](http://localhost:5173/download) | ₹50,000 | ₹1,800,000 GMV (₹90k fee) | 2.80x | Active |

**Total Incurred / Allocated Ad Spend**: ₹2,60,000  
**Projected Corridor GMV Generation**: ₹9,630,000  
**Projected Platform Revenue Inflow**: ₹481,500  

---

## 2. Detailed Campaign Breakdown & Creative Entry Points

### 🔹 CAMP-FB-MKT-001: Kirana Merchant Direct Supply Sourcing
- **Medium(s)**: Facebook Marketplace, Facebook Feed Ad
- **Creative / Copy**: [ads/CAMP-FB-MKT-001.html](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/ads/CAMP-FB-MKT-001.html)
- **Visual Asset**: [attachments/fb_marketplace_kirana_banner_1080x1080.svg](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/attachments/fb_marketplace_kirana_banner_1080x1080.svg)
- **Primary Landing Entry Point**:
  `http://localhost:5173/merchants?utm_source=facebook&utm_medium=marketplace&utm_campaign=kirana_direct_supply&utm_content=fb_marketplace_card_01`
- **Secondary Entry Points**:
  - Educational Funnel: `http://localhost:5173/how-it-works?utm_source=facebook&utm_medium=marketplace&ref=merch_learn`
  - Mobile App Download: `http://localhost:5173/download?utm_source=facebook&utm_medium=marketplace&ref=merch_app`
- **Unit Economics**:
  - Allocated Budget: ₹45,000 (Average CPC: ₹3.70)
  - Estimated Revenue Inflow: ₹1,250,000 GMV (₹62,500 net platform cut)
  - Projected Acquired Merchants: 150 active shop accounts

---

### 🔹 CAMP-YT-INF-002: Tech & Logistics Creator Corridor Deep Dive
- **Medium(s)**: YouTube Sponsored Integration, Pinned Comment, YouTube Shorts
- **Creator Partner**: Bharat Supply Chain Explorer (@BharatLogisticsTech)
- **Creative / Copy**: [ads/CAMP-YT-INF-002.html](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/ads/CAMP-YT-INF-002.html)
- **Brief / Talking Points**: [attachments/yt_creator_talking_points.md](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/attachments/yt_creator_talking_points.md)
- **Primary Landing Entry Point**:
  `http://localhost:5173/how-it-works?utm_source=youtube&utm_medium=influencer&utm_campaign=how_it_works_creator_review&utm_content=pinned_comment_link&creator_id=bharat_logistics_tech`
- **Secondary Entry Points**:
  - Direct Download: `http://localhost:5173/download?utm_source=youtube&utm_medium=influencer&utm_campaign=how_it_works_creator_review&utm_content=desc_download_link`
- **Unit Economics**:
  - Creator Sponsorship Fee: ₹75,000 flat
  - Estimated Revenue Inflow: ₹2,100,000 GMV (₹105,000 net platform fee)
  - Expected Direct Corridor Registrations: 1,200 accounts

---

### 🔹 CAMP-IG-REEL-003: Fleet Rider Instant Payouts Reel
- **Medium(s)**: Instagram Reels, Instagram Stories
- **Creative / Copy**: [ads/CAMP-IG-REEL-003.html](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/ads/CAMP-IG-REEL-003.html)
- **Storyboard**: [attachments/reel_storyboard_script.md](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/attachments/reel_storyboard_script.md)
- **Primary Landing Entry Point**:
  `http://localhost:5173/riders?utm_source=instagram&utm_medium=reels&utm_campaign=rider_daily_cash_payouts&utm_content=reel_instant_payout_cta`
- **Secondary Entry Points**:
  - Rider Android App APK: `http://localhost:5173/download?utm_source=instagram&utm_medium=reels&utm_campaign=rider_daily_cash_payouts&ref=rider_apk`
- **Unit Economics**:
  - Allocated Spend: ₹30,000 (Average CPC: ₹2.40)
  - Estimated Revenue Inflow: ₹980,000 GMV (₹49,000 platform rider dispatch fees)
  - Expected Active Fleet Signups: 220 riders

---

### 🔹 CAMP-GG-SEARCH-004: Wholesale Agro & FMCG Sourcing Intent
- **Medium(s)**: Google Search Ads, Google Performance Max
- **Creative / Copy**: [ads/CAMP-GG-SEARCH-004.html](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/ads/CAMP-GG-SEARCH-004.html)
- **Primary Landing Entry Point**:
  `http://localhost:5173/suppliers?utm_source=google&utm_medium=cpc&utm_campaign=bulk_fmcg_agro_wholesale&utm_content=headline_wholesale_supply_direct`
- **Secondary Entry Points**:
  - Platform Overview: `http://localhost:5173/how-it-works?utm_source=google&utm_medium=cpc&utm_campaign=bulk_fmcg_agro_wholesale&ref=supplier_overview`
- **Unit Economics**:
  - Allocated Spend: ₹60,000 (Average CPC: ₹12.20)
  - Estimated Revenue Inflow: ₹3,500,000 GMV (₹175,000 platform cut at 5%)
  - Expected Onboarded Wholesale Suppliers: 45 suppliers

---

### 🔹 CAMP-APP-DOWNLOAD-005: Buyer / Consumer App Launch Promo
- **Medium(s)**: Instagram Feed, Google App Campaigns, YouTube Shorts
- **Creative / Copy**: [ads/CAMP-APP-DOWNLOAD-005.html](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/marketing/ads/CAMP-APP-DOWNLOAD-005.html)
- **Primary Landing Entry Point**:
  `http://localhost:5173/download?utm_source=omnichannel&utm_medium=app_promo&utm_campaign=download_and_save_100&utm_content=install_app_direct_btn`
- **Secondary Entry Points**:
  - How It Works: `http://localhost:5173/how-it-works?utm_source=omnichannel&utm_medium=app_promo&ref=app_guide`
  - Quick Web Signup: `http://localhost:5173/login?signup=true&utm_source=omnichannel&utm_medium=app_promo&ref=quick_signup`
- **Unit Economics**:
  - Allocated Spend: ₹50,000 (CPI ~ ₹14.28)
  - Estimated Revenue Inflow: ₹1,800,000 GMV (₹90,000 platform net commission)
  - Projected App Installs: 3,500 downloads

---

## 3. Web Attribution Tracking Specification

The frontend handles these entry points in [web/src/apps/public/PublicLayout.tsx](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/web/src/apps/public/PublicLayout.tsx):
- Captures query parameters on first touch (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `creator_id`, `ref`).
- Persists attribution to `sessionStorage` under `lc_attribution`.
- Attaches the stored attribution object whenever the user completes signup or places their first order.

