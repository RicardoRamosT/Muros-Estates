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

### User Roles and Permissions
- **Admin**: Full access, creates all user types, manages everything
- **Perfilador**: Assigns developments to asesores
- **Asesor**: Views assigned clients/developments, marks client interest/follow-ups
- **Actualizador**: Creates and edits property/development data

### Granular Permissions System
Users can have fine-grained permissions beyond their base role. Stored as JSONB with format:
```typescript
{ sectionName: { view: boolean, edit: boolean } }
```
Available sections: propiedades, desarrollos, clientes, usuarios

Admins can set per-section view/edit permissions when creating or editing users. Permissions are displayed in the users table as compact badges showing section abbreviations with eye (view) and pencil (edit) icons.

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

## Brand Colors (Muros)
- **Primary**: Deep forest green (#1A4D2E) - HSL: 147 48% 21%
- **Secondary**: Golden accent (#D4AF37) - HSL: 43 76% 53%
- **Background**: Light grey (#F8F9FA)
- **Text**: Dark grey (#2C3E50)

## Key Features
- **City/Zone Cascading Filters**: Selecting a city dynamically updates available zones
- **Visual Amenity Selector**: 32 amenities displayed as clickable icons in a grid
- **Badge-style Feature Toggles**: Efficiency and security features as toggle badges
- **Golden Icon Theme**: All amenity icons are custom PNGs in golden (#D4AF37) color
- **Spanish (Mexico) UI**: All interface text in Spanish

## Running the Project
The application runs on port 5000 using the `npm run dev` command.

## Recent Changes (January 2026)
- **File Upload System**: Upload images and videos directly from device in property form with secure server-side validation
- **Video Support**: Properties now support video uploads with preview and controls
- **Dynamic Filter Sliders**: Price slider (incrementos $100,000) and area slider (incrementos 5 m²) now automatically adjust min/max based on available properties
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
