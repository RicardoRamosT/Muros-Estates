# Muros - Plataforma Inmobiliaria

## Overview
Muros is a Spanish (Mexico) real estate web platform for a company specializing exclusively in apartment developments (departamentos). The platform features an administrative dashboard for managing listings and clients with role-based access control, and a public-facing interface with a lead capture form and property search. Design follows Zillow/Airbnb inspiration with Muros brand identity.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter with protected routes
- **State Management**: TanStack React Query
- **Authentication**: Custom AuthProvider with session token management
- **UI Components**: Shadcn/UI with custom Muros brand theming
- **Styling**: Tailwind CSS with custom design tokens
- **Fonts**: Montserrat (headings), Open Sans (body)

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: bcrypt password hashing, session-based auth with Authorization header tokens
- **API**: RESTful endpoints with role-based access control middleware

### Data Model
- **Users**: Staff accounts with roles (admin, perfilador, asesor, actualizador)
- **Sessions**: Authentication sessions with expiration
- **Clients**: Leads from contact form (source: "web") or manually created (source: "manual")
- **Properties**: Apartments with full details including:
  - Developer and Development information
  - City/Zone location (Monterrey with 18 zones, CDMX with 8 zones)
  - Development type (Residencial, Uso mixto, etc.)
  - 32 amenities with custom golden icons
  - 7 efficiency features (Elevadores, Shoot de basura, etc.)
  - 4 security/other features (Video Vigilancia, Accesos independientes, etc.)
  - Price, bedrooms, bathrooms, area, floor, parking
  - Delivery date and value proposition
- **Development Assignments**: Links asesores to developments
- **Client Follow-ups**: Tracks asesor interactions with clients
- **Typologies**: Excel-like spreadsheet for property unit data with 50+ fields organized in 10 sections:
  - Fixed columns: # (row ID 1,2,3...), Activo (Sí/No status badge)
  - Generales: City, Zone, Developer, Development, Type, Level, View
  - Precio: Size (m²), Price, Discount%, Discount Amount, Final Price (calc), Price/m² (calc)
  - Distribución: Bedrooms, Flex, Bathrooms, Living/Dining/Kitchen, Balcony, Terrace, Laundry, Service, Parking, Storage
  - Esquema de Pago: Initial%, Initial Amount, Construction%, Monthly Payment, Down Payment%, Remaining, Delivery Date
  - Gastos Post-Entrega: ISA%, Notary, Equipment, Furniture, Total (calc)
  - Crédito Hipotecario: Amount, Start Date, Years, Interest%, Monthly Payment, End Date, Total (calc)
  - Mantenimiento: $/m², Initial, Date, Total (calc)
  - Renta: Initial, Start/End Dates, Rate%, Final, Months, Total (calc)
  - Inversión: Total, Net, Monthly, Rate (all calculated)
  - Plusvalía: Rate%, Days, Years, Months, Total Years, Total, Final Value (calc)
  - Cap/Promo: Capital Semilla (Seed Capital), Promo flags

### User Roles and Permissions
- **Admin**: Full access, creates all user types, manages everything
- **Perfilador**: Assigns developments to asesores
- **Asesor**: Views assigned clients/developments, marks client interest/follow-ups
- **Actualizador**: Creates and edits property/development data

### Granular Permissions System
Users have two-level fine-grained permissions beyond their base role. Stored as JSONB with format:
```typescript
{ 
  sectionName: { 
    view: boolean, 
    edit: boolean, 
    fields: { fieldKey: boolean, ... } 
  } 
}
```

**Section-level permissions**:
- Available sections: propiedades, desarrollos, clientes, usuarios
- Admins set view/edit per-section when creating/editing users
- Displayed in users table as compact badges with eye (view) and pencil (edit) icons

**Field-level permissions** (within each section):
- propiedades: 23 fields (title, description, price, images, videos, amenities, etc.)
- clientes: 9 fields (name, email, phone, status, etc.)
- desarrollos: 5 fields (developer, developmentName, city, zone, developmentType)
- usuarios: 7 fields (username, name, email, role, password, active, permissions)
- Controlled via collapsible section with "Todos" and "Ninguno" bulk actions
- Default: all fields enabled when edit is checked
- Fields defined in EDITABLE_FIELDS constant in shared/schema.ts

### User Management Pages
- `/admin/users` - User list with search, filter, and action buttons
- `/admin/users/new` - Full-page form to create new users
- `/admin/users/:id` - Full-page form to edit existing users

### Constants Structure (shared/constants.ts)
- **Developers**: 13 developers (IDEI, PLATE, Create, Proyectos 9, Grupo Verzache, etc.)
- **Developments**: 19 developments (Kyo Constella, Novus, ALTO, Moca Verde, etc.)
- **Cities**: Monterrey, CDMX (cascading zone selection)
- **Zones**: 26 total (18 Monterrey-specific, 8 CDMX-specific)
- **Development Types**: 5 types (100% Residencial, Mayoritariamente residencial, etc.)
- **Amenities**: 32 with golden icon PNG mappings (gym, pool, terraza, etc.)
- **Efficiency Features**: 7 options
- **Other Features**: 4 security-related options

## Pages

### Public Pages
- `/` - Home page with lead capture form in hero, search filters, property grid
- `/property/:id` - Property detail page with image gallery, amenity icons, contact info
- `/login` - Admin login page

### Admin Pages (Protected)
- `/admin` - Dashboard with statistics and property management table
- `/admin/properties/new` - Create new property form with visual amenity selector
- `/admin/properties/:id` - Edit existing property form
- `/admin/tipologias` - Excel-like spreadsheet for managing typologies with real-time sync

## API Endpoints

### Authentication (Public)
- `POST /api/auth/login` - Login with username/password, returns session token
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Get current user (requires auth)

### Contact Form (Public)
- `POST /api/contact` - Submit lead form, creates client record

### Properties (Mixed)
- `GET /api/properties` - Get all properties (public)
- `GET /api/properties/:id` - Get single property (public)
- `POST /api/properties` - Create property (admin, actualizador)
- `PUT /api/properties/:id` - Update property (admin, actualizador)
- `DELETE /api/properties/:id` - Delete property (admin only)

### Clients (Protected)
- `GET /api/clients` - List clients (admin, perfilador see all; asesor sees assigned)
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Create client manually
- `PUT /api/clients/:id` - Update client

### Users (Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user

### Assignments (Perfilador/Admin)
- `GET /api/assignments` - List development assignments
- `POST /api/assignments` - Assign development to asesor
- `DELETE /api/assignments/:id` - Remove assignment

### File Uploads (Admin/Actualizador)
- `POST /api/upload` - Upload images and videos (multipart/form-data)
- `GET /uploads/:filename` - Serve uploaded files with security headers

### Typologies (Admin/Actualizador)
- `GET /api/typologies` - List all typologies
- `GET /api/typologies/:id` - Get single typology
- `POST /api/typologies` - Create typology
- `PUT /api/typologies/:id` - Update typology (broadcasts via WebSocket)
- `DELETE /api/typologies/:id` - Delete typology (admin only)

### WebSocket
- `ws://host/ws` - Real-time typology updates (create/update/delete broadcasts)

## Brand Colors (Muros)
- **Primary**: Medium Blue (#0C83C6) - HSL: 202 89% 41%
- **Secondary**: Golden/Orange (#FFB549) - HSL: 43 76% 53%
- **Background**: Light grey (#F8F9FA)
- **Text**: Dark grey (#2D2926)
- **Light Gray**: (#D0D3D4) - Secondary neutral

## Key Features
- **City/Zone Cascading Filters**: Selecting a city dynamically updates available zones
- **Visual Amenity Selector**: 32 amenities displayed as clickable icons in a grid
- **Badge-style Feature Toggles**: Efficiency and security features as toggle badges
- **Golden Icon Theme**: All amenity icons are custom PNGs in golden (#D4AF37) color
- **Spanish (Mexico) UI**: All interface text in Spanish

## Running the Project
The application runs on port 5000 using the `npm run dev` command.

## Recent Changes (January 2026)
- **Typologies as Primary Data Source for Public Pages**: Critical architecture change where public pages (home.tsx, properties.tsx) now use typologies instead of properties table:
  - Created `/api/public/typologies` endpoint (no auth) returning only active typologies (active=true)
  - New `usePublicTypologies` hook with WebSocket integration for real-time updates
  - TypologyGrid and TypologyCard components for displaying apartment listings
  - Filters work with typology fields: size (m²), finalPrice/price, bedrooms, city, zone
  - Live badge shows "En vivo" when WebSocket connected for real-time sync
  - Admin Excel spreadsheet changes instantly reflect on public apartment listings
- **Excel-Style Column Filters**: Complete redesign of typology spreadsheet filters:
  - Each column header is a clickable dropdown with filter options
  - Sort options: A-Z / Z-A for text columns, menor a mayor / mayor a menor for numeric columns
  - Search box to filter values within the dropdown
  - Checkbox list showing all unique values from the data (e.g., Monterrey, CDMX for Ciudad)
  - "(Seleccionar todo)" option for bulk select/deselect
  - Visual indicator (highlighted header) when filter is active
  - Filter count badge and "Limpiar filtros" button in toolbar
  - Values sorted appropriately (alphabetically for text, numerically for numbers)
- **Typologies Spreadsheet**: New Excel-like interface at /admin/tipologias with:
  - 50+ editable fields organized in 10 collapsible sections
  - Inline editing for text, numbers, dropdowns, checkboxes, and dates
  - Automatic calculated fields (Precio Final, Precio/M², totals, mortgage, investment metrics)
  - Excel-style column filters with sort, search, and value checkboxes
  - Real-time WebSocket synchronization between multiple users
  - Role-based access (admin, actualizador)
- **WebSocket Server**: Native ws library integration for real-time typology updates
- **Enhanced Header Navigation**: Role-based admin navigation with Dashboard, Tipologías, and Usuarios links
- **Ver Más Feature**: Home page now shows only 4 properties with a "Ver Más Departamentos" button that navigates to a dedicated /propiedades page preserving active filters in URL
- **Dedicated Properties Page**: New /propiedades route with full property listing and all filters (city, zone, bedrooms, price, area, delivery, down payment)
- **Delivery Time Filter**: New "Entrega" slider filters properties by delivery timeline in 3-month increments (trimestres: 0-36 meses)
- **Down Payment Filter**: New "Enganche" slider filters properties by down payment percentage in 5% increments (5-50%)
- **Admin Property Form**: New fields for deliveryMonths and downPayment with step validation
- **File Upload System**: Upload images and videos directly from device in property form with secure server-side validation
- **Video Support**: Properties now support video uploads with preview and controls
- **Dynamic Filter Sliders**: Price, area, delivery, and down payment sliders now automatically adjust min/max based on available properties
- **Professional Hero Redesign**: Full-width hero with luxury apartment background images, dark gradient overlay, statistics badges (+50 Desarrollos, 2 Ciudades, 100% Verificados), preview image gallery, and glass-effect contact form
- **New "Why Choose Muros" Section**: Green-themed section with benefits and building imagery
- **Sticky Filter Bar**: Filters now stick to top when scrolling for easy access
- **Authentication System**: Implemented native username/password authentication with bcrypt, session management, and role-based access control
- **Database Migration**: Migrated from in-memory storage to PostgreSQL with Drizzle ORM
- **Lead Capture**: Added contact form in home page hero that creates client records in the database
- **Protected Routes**: Admin pages now require authentication, redirecting to login page
- **API Security**: All protected endpoints use Authorization header with session tokens
- **User Management**: Admin can create users with different roles (perfilador, asesor, actualizador)
- **Admin Credentials**: Default admin account: username "admin", password "admin123"

### Previous Changes
- Comprehensive schema refactor: city/zone replaces location/state
- Added developer, developmentName, developmentType fields
- Added deliveryDate, efficiency, otherFeatures, value fields
- Created constants file with all dropdown options and icon mappings
- Implemented City/Zone cascading filters throughout application
- Built visual amenity selector in admin form (32 icons in grid)
- Added badge-style toggles for efficiency and security features
- Updated property detail page with amenity icons and feature sections
- 8 sample properties with real developers and developments
- All automated UI tests passing
