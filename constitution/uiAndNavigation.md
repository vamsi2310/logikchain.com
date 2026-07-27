# UI and Navigation Specification

## Purpose

Define the user interface guidelines, mobile-centric layout structures, and navigation flows for each user role in the LogikChain platform.

## Scope

- Mobile-centric design principles
- Role auto-detection and shell mounting
- Layouts, pages, navigation bar icons, and menu items for each user role:
  - Buyer (fully specified)
  - Merchant
  - Driver
  - Distributor
  - Support
- Visual guidelines and design constraints

## Status

Draft

## Content

### Mobile-Centric Design Principles

LogikChain is a mobile-centric application. All user interfaces must be designed specifically for the mobile form factor, optimizing for touch targets, thumb-reach zones, and vertical scroll performance.

#### Core UI Guidelines
- **One Composition**: The first viewport of any landing or primary page must read as a single, cohesive composition, not a cluttered dashboard.
- **Brand First**: The brand or product name must be a hero-level signal, not just navigation text. No headline should overpower the brand.
- **Typography**: Use expressive, purposeful fonts. Avoid default system stacks (Inter, Roboto, Arial).
- **Backgrounds**: Do not rely on flat, single-color backgrounds. Use gradients, subtle patterns, or images to build atmosphere.
- **No Cards by Default**: Cards are allowed only as containers for direct user interaction. If removing a border, shadow, background, or radius does not hurt interaction or understanding, do not use a card. Never use cards in the hero section.
- **One Job per Section**: Each section must have exactly one purpose, one headline, and a single short supporting sentence.
- **Real Visual Anchors**: Imagery must show the product, place, atmosphere, or context. Decorative gradients do not count as the main visual idea.
- **Reduce Clutter**: Avoid pill clusters, stat strips, icon rows, boxed promos, and competing text blocks.
- **Intentional Motion**: Use motion to create presence and hierarchy, not noise. Implement 2-3 intentional transitions/animations per primary view.
- **Color & Aesthetics**: Define clear CSS variables. Avoid common AI design clusters:
  - No purple-on-white or purple-to-indigo gradients.
  - No warm cream (#F4F1EA) with high-contrast serif and terracotta accents.
  - No broadsheet-style layouts with hairline rules, zero border-radius, and dense columns.
  - Avoid biases toward dark mode, glow effects, rounded-full pills, multi-layer shadows, and emojis.
- **Responsiveness**: Ensure pages load and render perfectly on both mobile (primary focus) and desktop.

### Role Auto-Detection and Navigation Shell

Users cannot switch roles. The user's role is auto-detected upon authentication based on their `user type` in the `Users` table.
- **Default Role**: The default role for all newly registered users is `Buyer`.
- **Shell Mounting**: Upon login, the application detects the user's role and mounts the corresponding role-specific shell. This shell defines the bottom navigation bar, side menus, and accessible page routes.

---

### Buyer App Layout (Mobile Centric)

The Buyer interface is designed for village-based buyers to track active gigs, browse catalogs, place orders, and manage pickups.

#### 1. Bottom Navigation Bar Icons
- **Home** (Icon: `home` / `map-pin`): Active live gigs approaching the buyer's village.
- **Catalog** (Icon: `shopping-bag` / `book-open`): Browse products and place orders.
- **Village** (Icon: `globe` / `compass`): Village selection and preferences.
- **Pickup** (Icon: `package` / `check-circle`): Active packages ready for pickup from the merchant.
- **Profile** (Icon: `user`): Account settings and order history.

#### 2. Menu Items (Side Drawer / Profile Menu)
- **Profile Details**: View and edit personal information.
- **Selected Village**: Quick indicator and shortcut to change current village.
- **Order History**: List of past orders with status and receipts.
- **Help & Support**: Contact support or view FAQs.
- **Logout**: Securely sign out of the application.

#### 3. Core Pages and Layouts
- **Signup Page**: Mobile-optimized form for new buyers. Automatically registers user with the default role of `Buyer`.
- **Login Page**: Standard phone/Google login. Triggers role auto-detection upon success.
- **Home (Live Gigs)**:
  - Displays active gigs that are currently in transit.
  - Shows the estimated time of arrival (ETA) at the buyer's selected village.
  - Interactive timeline showing the driver's progress along the route.
- **Village Picker**:
  - A clean, searchable list of available villages.
  - Allows the buyer to choose their village to filter relevant gigs and catalogs.
- **Catalog Browse & Order**:
  - Displays product catalogs for active gigs.
  - **Constraint**: Orders can only be placed on catalogs of gigs that *have not yet reached* the selected village. Once a gig reaches the village, ordering is locked.
  - Simple, non-card catalog grid with expressive typography and a clear Call to Action (CTA) to add to cart.
- **My Orders**:
  - Displays active and past orders.
  - Shows order status (e.g., Pending, In Transit, Arrived at Merchant, Picked Up).
- **Pickup Page**:
  - Displays packages that have arrived at the local merchant stop.
  - Provides a pickup verification screen to confirm package collection from the merchant.

---

### Other Role Layouts (Derived from Use Cases)

#### Merchant App Layout
- **Bottom Navigation Bar**:
  - **Home**: Active gigs, incoming delivery alerts, and real-time ETAs.
  - **Catalog**: View available distributor pamphlets.
  - **Orders**: Manage orders placed by buyers and confirm receipt of goods from drivers.
  - **Dues**: Financial summary showing total dues owed to each distributor.
  - **Profile**: Account settings.
- **Menu Items**: Profile, Distributor Relations, Financial Statements, Logout.
- **Core Pages**: Gig Alert Dashboard, Catalog Viewer, Order Management (Fulfillment/Receipt), Dues & Payment Screen (integrated with payment gateway).

#### Driver App Layout
- **Bottom Navigation Bar**:
  - **Home**: Assigned gigs and handover screen.
  - **Active Gig**: Current route, stops, and navigation map.
  - **Trip**: Real-time progress updates (Start Trip, Reach Village, Reach Merchant).
  - **Profile**: Driver settings and statistics.
- **Menu Items**: Profile, Vehicle Info, Completed Gigs, Logout.
- **Core Pages**: OTP Handover Screen (secure entry for custody transfer), Route Map & Navigation, Stop Actions (Deliver Packages, Pick Up Packages).

#### Distributor App Layout
- **Bottom Navigation Bar**:
  - **Home**: Dashboard showing active gigs, driver statuses, and revenue.
  - **Setup**: Manage inventory, drivers, villages, and routes.
  - **Catalog**: Create and publish pamphlets/catalogs.
  - **Gigs**: Create, assign, and start gigs.
  - **Profile**: Distributor settings.
- **Menu Items**: Profile, Business Settings, Financial Reports, Logout.
- **Core Pages**: Inventory Manager, Driver & Village Registry, Catalog Creator, Gig Builder & OTP Dispatcher.

#### Support App Layout
- **Bottom Navigation Bar**:
  - **Home**: Platform health dashboard and audit logs.
  - **Users**: User administration (view, edit type, delete, enable/disable).
  - **Entities**: Distributor, Driver, and Merchant oversight.
  - **Profile**: Support account settings.
- **Menu Items**: Profile, Audit Logs, System Settings, Logout.
- **Core Pages**: User Admin Panel, Entity Association Editor (link villages/merchants/drivers to distributors), Driver Gig Tracker, Merchant Dues Inspector.

## Open Items

- [ ] Define exact icon library to be used (e.g., Lucide React, Feather, Material Icons).
- [ ] Specify transition animations for the 2-3 intentional motions per role.
- [ ] Define desktop-responsive layouts for Distributor and Support roles (as they may use web interfaces).

## Related Documents

- [useCases.md](./useCases.md)
- [Flows.md](./Flows.md)
- [databaseSchema.md](./databaseSchema.md)
- [architectureOverview.md](./architectureOverview.md)
- [securityAndCompliance.md](./securityAndCompliance.md)
- [Specification.md](./Specification.md)
