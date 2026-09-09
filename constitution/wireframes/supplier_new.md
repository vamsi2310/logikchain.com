# Supplier daily loop (proposed, desktop)

**Nav:** Dashboard · Gigs · Inventory · Finance

1024px+ desktop console (`xl`). A persistent **left rail** replaces the bottom tab bar, matching [SPT-18](Support.md). Profile stays in the **top-right avatar**. List and detail panes scroll independently. Touch targets stay 48px.

See also: [Shared](Shared.md) · [Buyer](Buyer.md) · [Merchant](Merchant.md) · [Driver](Driver.md) · [Supplier](Supplier.md) · [Support](Support.md)

Foundations: [Foundations.md](Foundations.md) · IA and screen IDs: [Navigation.md](Navigation.md) · Shared states, errors, AI and invoice: [Patterns.md](Patterns.md)

This file redraws two screens around the morning job: pick one of today's three highest-yield routes, then load a pamphlet against the warehouse on the same screen. Canonical 360px screens remain in [Supplier.md](Supplier.md) until this body is merged. **Data** for `SUP-02` / `SUP-08` lives in [Supplier.md](Supplier.md).

**Legend**


| Symbol        | Meaning                                      |
| ------------- | -------------------------------------------- |
| `[ btn ]`     | Primary or secondary button                  |
| `( )`         | Radio                                        |
| `[====O----]` | Quantity slider — no typed input             |
| `≡`           | Drag handle (pamphlet ↔ warehouse)           |
| `👤`          | Profile (header)                             |
| `▸`           | Active rail item                             |
| `★`           | Ranked recommendation                        |
| `🔔4`         | Attention count — not a competing dashboard row |
| `[Esc Stop]`  | Emergency exit — freezes live metric refresh |
| `:: … ::`     | Yellow outline — existing pamphlet qty was modified |
| `// … //`     | Red outline — SKU newly added this session   |


Every screen below must also satisfy the loading, empty, error, offline, queued and disabled states defined in [Patterns.md](Patterns.md). Yellow and red outlines always travel with the words `Changed` and `New`; colour is never the only signal.

---

## Heuristics this layout must satisfy

These five rules are the contract for `SUP-02` and `SUP-08`. The drawings below exist to make each one visible, not to decorate it.

**1. Visibility of system status.** Every slider move, add, or drag updates the ₹ figure and the truck bar in under one second, stamped `just now`. A yellow outline (`Changed`) marks an AI qty the supplier edited; a red outline (`New`) marks a SKU they added. The supplier is never looking at a stale load.

**2. User control and freedom.** `[Esc Stop]` is the marked emergency exit: it cancels live metric refresh and freezes the last good ₹ and truck %. `Esc` is the keyboard equivalent and is never the only control. AI suggestions are not a trap — drag a card from the pamphlet **back** to the warehouse to reverse it, or drag a warehouse SKU onto the pamphlet to add it.

**3. Error prevention.** Truck capacity is a hard stop at 100%: the bar fills, further adds are refused, and the overflow is never applied. Quantity is a slider, not a text field, so a typo cannot load 500 box when 50 was meant. The slider clamps at 0 and at `min(Product.stock, remaining capacity)`.

**4. Recognition rather than recall.** The warehouse is a scrollable list on the **right** of the same screen as the pamphlet. Name, remaining qty, and the add/drag action stay visible. The supplier does not remember what is in stock, nor leave this screen to look it up.

**5. Aesthetic and minimalist design.** The dashboard shows only today's top three high-potential routes and a `[ Create pamphlet ]` action on each. Plan bars, network admin, and buyer conversion do not compete for attention here — they stay on their own rail destinations. Icons (`★`, `🔔`, `≡`, `◀`) carry labels; they do not replace them. Every visual on these two screens exists to help the supplier maximise the Profit target.

---

## Screen index

| ID | Screen |
| -- | ------ |
| `SUP-02` | Dashboard — today's best 3 |
| `SUP-08` | Pamphlet left, warehouse inventory right |

Over-capacity and a frozen refresh are states of `SUP-08`, not their own IDs.

---

## SUP-02 Dashboard — today's best 3

Nothing on this screen except the three routes and the action that loads a pamphlet. Attention is the bell badge (`🔔4`), not a second set of cards. Network, finance, and inventory lists live on the rail.

```
┌────────┬─────────────────────────────────────────────────────────────────────┐
│ LOGIK  │  ★ Dashboard                                  🔊  🔔4  [👤]            │
│        │  26-08-2026                                                         │
│ ▸ Dash │─────────────────────────────────────────────────────────────────────│
│   Gigs │                                                                     │
│   Inv. │  ★ Top 3 high-potential routes for today                            │
│   Fin. │                                                                     │
│        │  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐  │
│        │  │★ Ongole → Markapur│ │  Podili circuit   │ │  Ongole west loop │  │
│        │  │  Demand  High     │ │  Demand  Med-high │ │  Demand  Medium   │  │
│        │  │                   │ │                   │ │                   │  │
│        │  │[ Create pamphlet ]│ │[ Create pamphlet ]│ │[ Create pamphlet ]│  │
│        │  └───────────────────┘ └───────────────────┘ └───────────────────┘  │
└────────┴─────────────────────────────────────────────────────────────────────┘
```

The fourth route never appears here. Ranking is derived from recent gig demand on each `Route` plus buyer counts in its villages — it is not a new Cloud Function, and it is not a promise the supplier must fulfil. `[ Create pamphlet ]` is the only primary action; it is not "View route".

**Fewer than three routes**

```
┌────────┬─────────────────────────────────────────────────────────────────────┐
│ LOGIK  │  ★ Dashboard                                  🔊  🔔   [👤]            │
│ ▸ Dash │─────────────────────────────────────────────────────────────────────│
│   Gigs │  ★ Top 3 high-potential routes for today                            │
│   Inv. │  ┌───────────────────┐                                              │
│   Fin. │  │★ Ongole → Markapur│                                              │
│        │  │  Demand  High     │                                              │
│        │  │[ Create pamphlet ]│                                              │
│        │  └───────────────────┘                                              │
└────────┴─────────────────────────────────────────────────────────────────────┘
```

**Empty — no routes**

```
┌────────┬─────────────────────────────────────────────────────────────────────┐
│ LOGIK  │  ★ Dashboard                                  🔊  🔔   [👤]            │
│ ▸ Dash │─────────────────────────────────────────────────────────────────────│
│   Gigs │                                                                     │
│   Inv. │                         [ ★ ]                                       │
│   Fin. │              No high-potential routes today                         │
│        │              Add a route, then come back.                           │
│        │                      [  Add a route  ]                              │
└────────┴─────────────────────────────────────────────────────────────────────┘
```

**Actions:** `[ Create pamphlet ]` opens `SUP-08` with this `routeId` already bound. `🔔` opens the existing attention queues (credit `SUP-04.3`, payout `SUP-05.2`, stock `SUP-06`, settlement `SUP-16.1`) without putting them on this canvas. `[ Add a route ]` opens `SUP-07.1`. Convert-buyer and network remain in [Supplier.md](Supplier.md), reached from the rail, not from this dashboard.

---

## SUP-08 Pamphlet and warehouse

One screen, two panes. Left is the pamphlet for this route. Right is every SKU in the warehouse, with remaining qty always visible. Drag works **both ways**. Quantity is a slider. ₹ and the truck bar update on every change, under one second, unless the supplier hits `[Esc Stop]`.

```
┌────────┬────────────────────────────────────┬────────────────────────────────┐
│ LOGIK  │  ← Ongole → Markapur   [Esc Stop]  │  Warehouse inventory           │
│        │                                    │  🔍 Search                      │
│   Dash │  Target  (•) Profit                │────────────────────────────────│
│   Gigs │          ( ) Revenue               │                                │
│ ▸ Inv. │          ( ) Satisfaction          │  ┌──────────────────────────┐  │
│   Fin. │────────────────────────────────────│  │≡  Potatoes               │  │
│        │  ₹45,000            just now       │  │   100 box in warehouse   │  │
│        │  Truck ████████░░ 80%              │  │   drag onto pamphlet →   │  │
│        │────────────────────────────────────│  └──────────────────────────┘  │
│        │  ℹ Why this layout                 │  ┌──────────────────────────┐  │
│        │    Maximises profit: Ganesh        │  │≡  Garlic                 │  │
│        │    Chaturthi demand is up in       │  │   20 box in warehouse    │  │
│        │    Karavadi and Koppolu.           │  │   drag onto pamphlet →   │  │
│        │────────────────────────────────────│  └──────────────────────────┘  │
│        │  Pamphlet                  scroll  │  ┌──────────────────────────┐  │
│        │  ┌──────────────────────────────┐  │  │≡  Carrots                │  │
│        │  │:: Changed · Tomatoes     ::  │  │  │   40 box in warehouse    │  │
│        │  │:: 50 box · ₹18 / box     ::  │  │  │   drag onto pamphlet →   │  │
│        │  │:: [========O--------]    ::  │  │  └──────────────────────────┘  │
│        │  │:: ≡  drag to warehouse   ::  │  │  ┌──────────────────────────┐  │
│        │  └──────────────────────────────┘  │  │≡  Ginger                 │  │
│        │  ┌──────────────────────────────┐  │  │   15 box in warehouse    │  │
│        │  │// New · Potatoes         //  │  │  │   drag onto pamphlet →   │  │
│        │  │// 10 box · ₹22 / box     //  │  │  └──────────────────────────┘  │
│        │  │// [===O-------------]    //  │  │  ┌──────────────────────────┐  │
│        │  │// ≡  drag to warehouse   //  │  │  │≡  Chillies               │  │
│        │  └──────────────────────────────┘  │  │   30 box in warehouse    │  │
│        │  ┌──────────────────────────────┐  │  │   drag onto pamphlet →   │  │
│        │  │   Onions                     │  │  └──────────────────────────┘  │
│        │  │   25 box · ₹16 / box         │  │  ┌──────────────────────────┐  │
│        │  │   [======O----------]        │  │  │≡  Tomatoes               │  │
│        │  │   ≡  drag to warehouse       │  │  │   50 box remaining       │  │
│        │  └──────────────────────────────┘  │  │   drag more onto pamphlet│  │
│        │                                    │  └──────────────────────────┘  │
│        │  Drag either way. Esc stops live   │  v  scroll for the rest  v     │
│        │────────────────────────────────────│────────────────────────────────│
│        │  [ Preview as buyer ]              │                                │
│        │  [ Delete ]      [ Save pamphlet ] │                                │
└────────┴────────────────────────────────────┴────────────────────────────────┘
```

Tomatoes: yellow outline + `Changed` — the AI qty was edited with the slider. Potatoes: red outline + `New` — dragged on from the warehouse this session. Onions: the unmodified recommendation, standard outline. Warehouse Tomatoes still lists **50 box remaining**, so the supplier does not have to remember what is left in stock.

**Esc — refresh frozen** — still `SUP-08`. The last good ₹ and truck % stay on screen. Edits are not discarded; only the live rewrite stops.

```
│        │  ₹ ··· refreshing        [Esc]     │                                │
│        │  Truck ████████░░ 80%  frozen      │                                │
```

**Truck at 100%** — still `SUP-08`. The bar is full. Drags onto the pamphlet and slider moves that would cross 100% are refused. Dragging a pamphlet card **back** to the warehouse is the way out.

```
│        │  ₹52,400            just now       │  ≡  Garlic                     │
│        │  Truck ██████████ 100%             │     ⚠ Full — drag left back    │
│        │  ⚠ Full — no further additions     │     drag onto pamphlet         │
```

**Over-capacity attempt** — a dialog on `SUP-08`, not a new screen.

```
┌──────────────────────────────────────────┐
│  Truck is full                    [ X ]  │
│                                          │
│  That add would take capacity to 108%.   │
│  Drag an item back to the warehouse,     │
│  or lower a slider, then try again.      │
│                                          │
│  [  OK  ]                                │
└──────────────────────────────────────────┘
```

**Actions:** Target radios are local UI state and default to Profit; they do not write until Save. Each slider move, warehouse→pamphlet drag, and pamphlet→warehouse drag rewrites the in-memory pamphlet and refreshes ₹ + truck % in under one second (heuristic 1). `[Esc Stop]` / `Esc` cancel that refresh and freeze the last good figures; they do not discard edits (heuristic 2). Dragging a pamphlet card onto the warehouse removes it from the load and restores its qty to the right-hand list. Dragging a warehouse SKU onto the pamphlet appends a red `New` card at the slider's default (10 box or remaining capacity, whichever is smaller), never above `Product.stock`. There is no quantity text field (heuristic 3). `[ Preview as buyer ]` renders `BUY-05.1`. `[ Save pamphlet ]` writes `Pamphlet` (direct, supplier-owned) bound to this `routeId`, then offers compose on `SUP-09` with the route and pamphlet already selected. `[ Delete ]` is the existing confirm that names upcoming gigs using it. AI never writes: the starting layout is a proposal, the explanation is why, and Save is the supplier's.

Rail `▸ Inv.` is highlighted because the pamphlet is an inventory job; Dashboard stays one click in the rail. Back (`←`) returns to `SUP-02` with the same three routes.

---

## End-to-end

```
SUP-02  Dashboard (top 3 only)
  → Create pamphlet
SUP-08  Left: pamphlet (sliders, yellow/red)
        Right: warehouse (qty always visible)
        Drag either way · Esc freezes metrics
  → Save pamphlet → Compose gig
  → Gigs feed
```

Gigs, inventory lists, finance, and network remain on the rail. They are not on the dashboard, so they cannot compete with the three routes.
