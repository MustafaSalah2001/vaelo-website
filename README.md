# VAELO Atelier: Whole-Site WebGL Clothing Website

A full-stack website for a clothing brand where **every image on every page is rendered in WebGL**, plus three dedicated 3D scenes. It is a portfolio project.

> **VAELO Atelier is a fictional brand.** Prices, stories and figures are demo content, flagged `isDemo` in the database and labelled on the site. The **photos are real**: they are free Unsplash photos (Unsplash License), hot-linked from `images.unsplash.com`. They show garments that are not made by any brand called VAELO.

Same architecture as the ORVEN project (ASP.NET Core 9, 4 layers, EF Core, SQL Server, React + three.js), with a clothing domain: colour × size variants, stock, colour-specific photos, lookbooks and reservation requests.

## What makes it 3D

**1. Every photo is a WebGL surface.** One canvas sits fixed behind the page. Each image's HTML element registers itself, and the canvas draws the photo exactly where the element is, every frame. As a result each image:
- **drops in** like a length of cloth unrolling the first time it scrolls into view
- **drags with scroll speed**: the middle lags behind the edges, like fabric
- **ripples under the cursor** like a finger pressed into cloth
- **reveals a second photo** from the cursor on hover (on shop cards)
- has **parallax depth** as it moves through the viewport
- **fades out with the page** on navigation

The real `<img>` stays in the HTML for layout, accessibility and SEO, and it is the fallback when WebGL is missing, reduced motion is on, or a photo can't be used as a texture.

**2. The hanging rail** (home page hero): the season's pieces hang on hangers along a curved steel rail. Scrolling turns the rail so each garment comes to the front, while the captions, price and link follow. Wind from the pointer and the scroll speed moves through the cloth.

**3. The cloth viewer** (every product page): the product photo hangs as a garment. You can drag to turn it on its hanger. When you pick another colour, **the new photo flows down the cloth** from the hanger.

**4. The photo ring** (lookbooks): every campaign photo sits on a slowly turning ring that you can drag to spin.

All shading, folds and transitions are custom GLSL (`frontend/src/gl/shaders.ts`). There are no model files to download.

## Run it locally (Windows, .NET 9, your SQL Server)

The development connection string already points at **`Server=ABOOSALAH`**, database `Vaelo_Dev`. It runs side by side with ORVEN: the API is on **5090** and the site is on **5174**.

### API
```
cd backend
dotnet restore
dotnet ef migrations add InitialCreate -p src/CompanyWebsite.Infrastructure -s src/CompanyWebsite.API -o Persistence/Migrations
dotnet run --project src/CompanyWebsite.API
```
Or in Visual Studio 2022: open `backend/CompanyWebsite.sln`, set **CompanyWebsite.API** as the startup project, and press ▶. In the Package Manager Console the migration command is
`Add-Migration InitialCreate -Project CompanyWebsite.Infrastructure -StartupProject CompanyWebsite.API -OutputDir Persistence/Migrations`.

On first run the API creates the database and seeds 10 products (90 colour/size variants), 3 lookbooks and 4 services. Swagger is at **http://localhost:5090/swagger**.

To use another SQL Server, change `ConnectionStrings:Default` in `appsettings.Development.json`. The key must be `Default`.

### Website
```
cd frontend
npm install
npm run dev
```
Open **http://localhost:5174**. If the API isn't running, the site uses the bundled copy of the same content and says so in the footer.

### Tests
```
cd backend
dotnet test
```

## Deploy
- **Static portfolio demo (no backend):** `VITE_DEMO_ONLY=true VITE_ROUTER=hash VITE_BASE=./ npm run build`, then upload `frontend/dist`.
- **Full stack:** `cp .env.example .env`, set the values, then run `docker compose up --build`. The web app is at :8083 and the API at :8082.

## API
| Method | Route | Notes |
|---|---|---|
| GET | `/api/products?category=&color=&search=&sort=&featured=` | `sort`: featured, newest, price-asc, price-desc |
| GET | `/api/products/{slug}` | Colours, ordered sizes, variants with stock, photos per colour, lookbooks |
| GET | `/api/product-categories` | |
| GET | `/api/lookbooks`, `/api/lookbooks/{slug}` | Detail includes "shop the look" products |
| GET | `/api/services`, `/api/services/{slug}` | |
| GET | `/api/company`, `/api/settings` | Brand profile; `site.*` settings hold page images |
| POST | `/api/contact` | Message |
| POST | `/api/requests` | `type`: Reservation (checks the colour/size exists and is in stock), MadeToMeasure, Wholesale (company required) |
| POST | `/api/auth/login` | JWT for the admin endpoints |
| * | `/api/admin/products`, `/api/admin/inquiries` | Admin role; product upsert includes variants with unique SKUs |

## Replacing the demo brand
- **Content and photos:** edit `backend/src/CompanyWebsite.Infrastructure/Seed/demo-content.json` before the first run (or use the admin API), then run `npm run sync:demo`. Any image URL works. Unsplash URLs are resized automatically, and other hosts need CORS enabled to be used as WebGL textures; otherwise they fall back to a normal image.
- **Look:** change the colour and font tokens at the top of `frontend/src/styles/index.css`.
