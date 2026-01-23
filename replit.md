# Muros - Plataforma Inmobiliaria

## Overview
Muros is a real estate web platform for a company specializing in apartment developments in Mexico. It features an administrative dashboard for managing listings and clients with role-based access control, and a public-facing interface for property search and lead capture. The platform is inspired by Zillow/Airbnb and uses the Muros brand identity. Its core purpose is to streamline the listing, management, and sales process for apartment developments.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### Frontend
- **Framework**: React with Vite and TypeScript
- **Routing**: Wouter with protected routes
- **State Management**: TanStack React Query
- **Authentication**: Custom AuthProvider with session token management
- **UI Components**: Shadcn/UI with custom Muros brand theming
- **Styling**: Tailwind CSS with custom design tokens
- **Fonts**: Montserrat (headings), Open Sans (body)
- **UI/UX Decisions**: Zillow/Airbnb inspired design, all interface text in Spanish, custom golden icons for amenities, cascading city/zone filters, visual amenity selectors, badge-style feature toggles.
- **Key Features**:
    - **Public Interface**: Home page with lead capture, search filters, property grid, dedicated property detail pages.
    - **Admin Dashboard**: Comprehensive management for developers, developments, clients, users, and typologies (property units).
    - **Excel-style Typology Spreadsheet**: Inline editing for 50+ fields, calculated fields, real-time WebSocket synchronization, column filters with sort, search, and checkbox options.
    - **Dynamic Filtering**: Sliders for price, area, delivery timeline (trimestres), and down payment percentage, with automatic min/max adjustment based on available properties.
    - **Media Management**: Individual typology-based image and video uploads with previews.
    - **Role-Based Navigation**: Admin header navigation adapts based on user roles.

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: bcrypt for password hashing, session-based authentication using Authorization header tokens.
- **API**: RESTful endpoints with role-based access control middleware.
- **WebSocket**: Native `ws` library for real-time typology updates (create/update/delete broadcasts).

### Data Model
- **Users**: Staff accounts with roles: Admin, Perfilador (assigns developments), Asesor (views assigned clients/developments), Actualizador (creates/edits property data).
- **Permissions**: Granular, two-level fine-grained permissions system (section-level view/edit, field-level visibility) stored as JSONB.
- **Clients**: Leads from web forms or manual creation.
- **Properties**: Detailed apartment listings including developer, development, city/zone, development type, amenities (32 types), efficiency features (7 types), security/other features (4 types), pricing, area, bedrooms, bathrooms, delivery date, value proposition.
- **Typologies**: Primary data source for public pages, representing individual property units with 50+ detailed fields across 10 sections (General, Price, Distribution, Payment Scheme, Post-Delivery Costs, Mortgage Credit, Maintenance, Rent, Investment, Plusvalía).
- **Constants**: Centralized configuration for developers, developments, cities, zones, development types, amenities, and features.

## External Dependencies
- **PostgreSQL**: Relational database for persistent data storage.
- **Vite**: Frontend build tool.
- **Wouter**: Client-side routing library.
- **TanStack React Query**: Data fetching and state management.
- **Shadcn/UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **ws**: WebSocket library for real-time communication.

## Admin Pages Structure
- `/admin` - Dashboard with statistics
- `/admin/desarrolladores` - Excel-like spreadsheet for developer companies (CRUD: name, logo, contact info, website, notes)
- `/admin/desarrollos` - Excel-like spreadsheet for building projects (CRUD: developer link, name, city, zone, type, delivery date, address, coordinates, notes)
- `/admin/tipologias` - Excel-like spreadsheet for property units with 50+ fields and real-time WebSocket sync
- `/admin/prospectos` - Client/lead management (previously /admin/clientes)
- `/admin/documentos` - Document management system with 3 tabs:
  - **Desarrolladores**: Hierarchical navigation (Developer → Development → Typology) with section-based filtering (Legales, Venta, Productos, Mercadotecnia)
  - **Clientes**: Client documents with asesor-based access control (non-admins see only their assigned clients)
  - **De Trabajo**: Internal work documents (legal, contratos, etc.)
- `/admin/catalogos` - Master database for dropdown values with 6 tabs: Cities, Zones, Development Types, Amenities, Efficiency Features, Other Features
- `/admin/users` - User management with role-based access

## Public Share Pages
- `/s/:token` - Public document access page (no authentication required)
  - Tokenized access via share links created by admins
  - Permissions: canView (download documents), canUpload (upload files)
  - Expiration: permanent or days-based (default 7 days)
  - Shows only shareable documents

## API Endpoints
- `/api/developers` - CRUD for developer companies
- `/api/developments-entity` - CRUD for building projects (uses -entity suffix to avoid route conflicts)
- `/api/typologies` - CRUD for property units with WebSocket broadcast on changes
- `/api/clients` - CRUD for leads/prospects
- `/api/users` - User management (admin only)
- `/api/auth/*` - Authentication endpoints
- `/api/catalog/*` - CRUD for catalog data (cities, zones, development-types, amenities, efficiency-features, other-features)

## Recent Changes (January 2026)
- Added Catálogos admin page with 6 tabs for managing master dropdown values (Cities, Zones, Development Types, Amenities, Efficiency Features, Other Features)
- Created 6 new database tables for catalogs with Zod validation on all API endpoints
- Initial data populated: 2 cities, 26 zones (18 Monterrey, 8 CDMX), 5 development types, 32 amenities, 7 efficiency features, 4 other features
- Added Developers admin page with Excel-like spreadsheet interface
- Added Developments admin page with Excel-like spreadsheet interface
- Updated schema with new developer fields (contactName, contactPhone, contactEmail, notes)
- Updated schema with new development fields (latitude, longitude, notes; made developerId nullable)
- Updated header navigation with 7 sections: Dashboard, Desarrolladores, Desarrollos, Tipologías, Prospectos, Catálogos, Usuarios
- Renamed "Clientes" to "Prospectos" throughout admin interface
- Added Documentos admin page with 3-tab interface (Desarrolladores, Clientes, De Trabajo)
- Implemented hierarchical document navigation (Developer → Development → Typology → Section)
- Created share link system with tokenized public access, permissions (canView, canUpload), and expiration options
- Added public share page at /s/:token for external clients to access shared documents without authentication
- Implemented asesor-based access control for client documents (non-admins see only their assigned clients)
- Added Clientes section distinct from Prospectos with 15 financial fields (precioFinal, separacion, fechaSeparacion, enganche, fechaEnganche)
- Implemented dynamic permission context switching for ProspectsSpreadsheet (prospectos vs clientes)
- Added clientes permissions in PAGE_PERMISSIONS: Finanzas (111110011111111), Asesor (111222222222222), Desarrollador (111110011111111)
- Added currency type support for financial fields with MXN formatting
- Corrected Desarrollos permissions (54 columns) with exact bitmask mappings:
  - Profiler: 1-47 view, 48-54 none
  - Finanzas: 1-5 view, 6-29 none, 30-54 view
  - Asesor: 1-47 view, 48-52 none, 53-54 view
  - Desarrollador: 1-5 view, 6-8 none, 9-54 view