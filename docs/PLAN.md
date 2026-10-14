# VAELO Atelier: Project Plan

> Fictional clothing brand for a portfolio project. Real Unsplash photos, invented content.

## 1. Architecture

```
React 19 + TS (Vite)                         ASP.NET Core 9 API
┌───────────────────────────────┐  JSON    ┌───────────────────────────────┐
│ DOM: layout, text, forms, a11y│ ───────▶ │ Controllers · JWT · RateLimit │
│ ─────────────────────────────  │          │ Application: DTOs, services   │
│ GL registry (DOM ⇄ WebGL link)│          │ Infrastructure: EF Core, seed │
│ One fixed <Canvas> (R3F/three)│          │ Domain: entities              │
│  ImagePlane · Rail · Cloth ·  │          └──────────────┬────────────────┘
│  Ring  (custom GLSL)          │                         ▼
└───────────────────────────────┘                    SQL Server
```

### How "whole site 3D" works
1. A component (`GLImage`, `ClothViewer`, the rail, the ring) renders normal HTML and calls `useGLElement(kind, ref, …)`.
2. The element joins `gl/registry.ts` along with its texture URLs and live pointer input.
3. `GLStage` (one canvas, `position: fixed`, `pointer-events: none`, behind `<main>`) uses a perspective camera placed so that **1 world unit = 1 CSS px** at z = 0.
4. Every frame each object reads its element's `getBoundingClientRect()` and positions and scales itself there. Off-screen objects are skipped.
5. Shared signals in `gl/motion.ts` (smoothed scroll velocity, pointer) drive drag, wind and parallax.
6. When the DOM element leaves (detected with framer-motion's `useIsPresent`), its object fades out with the page transition, and the registry removes it later.
7. Textures are reference-counted (`gl/textures.ts`), sized to the element's width, and freed 8 s after their last user goes, so GPU memory follows what is on screen.

Fallbacks: no WebGL2, `prefers-reduced-motion`, a lost GPU context, or a photo that can't be used as a texture each leave the `<img>` visible, so the site keeps working.

## 2. Database

```
ProductCategory 1─* Product 1─* ProductVariant   (colour, hex, size, SKU unique, stock ≥ 0)
                     Product 1─* ProductMedia     (photo, ColorName → used by the colour switch)
                     Product 1─* ProductSpecification / ProductFeature
                     Product *─* Lookbook         (LookbookProducts: "shop the look")
Lookbook 1─* LookbookMedia
Service 1─* ServiceBenefit
OrderRequest (Reservation | MadeToMeasure | Wholesale) *─0..1 Product (SetNull)
ContactInquiry · CompanyProfile (+Metrics, Milestones) · SiteSetting · Testimonial · AdminUser
```

Constraints: a unique SKU; a unique (product, colour, size); check constraints on `Price ≥ 0` and `Stock ≥ 0`; `decimal(10,2)` prices with an ISO currency code; enums stored as strings.

Business rules (in `InquiryService`):
- A reservation must name an existing colour/size combination that is in stock.
- A wholesale request needs a company name.
- A honeypot submission looks successful but is not stored.

## 3. Design system

| Token | Value | Use |
|---|---|---|
| stone | `#E8E6E1` | page; the canvas is transparent over it |
| ink | `#17171A` | text, primary buttons |
| graphite | `#5C5A55` | secondary text (≥ 5:1 on stone) |
| seam | `#CFCBC3` | hairlines, image placeholders |
| cobalt | `#2B3FE0` | the one accent: a "thread" under the wordmark, links, the timeline |

- **Type:** Bodoni Moda for display sizes only (fashion house vernacular), Instrument Sans for everything else.
- **Shapes:** square corners and hairlines, like a printed lookbook. The editorial grids are deliberately asymmetric.
- **Motion:** the signature is the rail. Other motion comes from the cloth effects, which mostly answer scroll or the pointer.

## 4. Pages
- **Home:** rail hero → intro + figures → latest lookbook spread → shop by kind → repairs promise → visit the atelier.
- **Shop:** kind, colour, search and sort (all in the URL), with a grid of cards that reveal a second photo on hover.
- **Product:** cloth viewer + photos for the chosen colour, colour and size pickers (sold out shown per colour), an inline reservation, made-to-measure, details, features, lookbooks and related pieces.
- **Lookbooks:** the photo ring, then alternating spreads. Each detail page has an editorial layout with "shop the look".
- **Services:** made-to-measure, repairs for life, wardrobe appointments, wholesale.
- **Atelier:** story, studio photos, mission and vision, house rules, and a timeline stitched by a cobalt thread.
- **Contact:** message, made-to-measure and wholesale tabs; address and hours.

## 5. Roadmap
| Phase | Scope | Status |
|---|---|---|
| 1 | Everything above, plus seed data, tests, Docker and the offline demo | ✅ code written; frontend DOM verified in a browser; WebGL and `dotnet build` to verify locally |
| 2 | Admin dashboard UI (products with variant grid, photo upload, inbox) | next |
| 3 | Basket and checkout (Stripe), stock decrement on order | |
| 4 | Self-hosted, pre-sized photos (CDN), sitemap, pre-rendering, Lighthouse/axe pass | |
