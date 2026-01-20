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
- `/admin/users` - User management with role-based access

## API Endpoints
- `/api/developers` - CRUD for developer companies
- `/api/developments-entity` - CRUD for building projects (uses -entity suffix to avoid route conflicts)
- `/api/typologies` - CRUD for property units with WebSocket broadcast on changes
- `/api/clients` - CRUD for leads/prospects
- `/api/users` - User management (admin only)
- `/api/auth/*` - Authentication endpoints

## Recent Changes (January 2026)
- Added Developers admin page with Excel-like spreadsheet interface
- Added Developments admin page with Excel-like spreadsheet interface
- Updated schema with new developer fields (contactName, contactPhone, contactEmail, notes)
- Updated schema with new development fields (latitude, longitude, notes; made developerId nullable)
- Updated header navigation with 7 sections: Dashboard, Desarrolladores, Desarrollos, Tipologías, Prospectos, Documentos, Usuarios
- Renamed "Clientes" to "Prospectos" throughout admin interface