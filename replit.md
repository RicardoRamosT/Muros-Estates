# Muros - Plataforma Inmobiliaria

## Overview
Muros is a Spanish (Mexico) real estate web platform for a company specializing exclusively in apartment developments (departamentos). The platform features an administrative dashboard for managing listings with comprehensive apartment-specific details and a public-facing search interface with advanced filtering capabilities. Design follows Zillow/Airbnb inspiration with Muros brand identity.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Shadcn/UI with custom Muros brand theming
- **Styling**: Tailwind CSS with custom design tokens
- **Fonts**: Montserrat (headings), Open Sans (body)

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Storage**: In-memory storage with sample data
- **API**: RESTful endpoints for property CRUD operations

### Data Model
- **Properties**: Apartments with full details including:
  - Developer and Development information
  - City/Zone location (Monterrey with 18 zones, CDMX with 8 zones)
  - Development type (Residencial, Uso mixto, etc.)
  - 32 amenities with custom golden icons
  - 7 efficiency features (Elevadores, Shoot de basura, etc.)
  - 4 security/other features (Video Vigilancia, Accesos independientes, etc.)
  - Price, bedrooms, bathrooms, area, floor, parking
  - Delivery date and value proposition
- **Users**: Basic user authentication schema (not implemented in MVP)

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
- `/` - Home page with hero section, city/zone cascading filters, property grid
- `/property/:id` - Property detail page with image gallery, amenity icons, contact info

### Admin Pages  
- `/admin` - Dashboard with statistics and property management table
- `/admin/properties/new` - Create new property form with visual amenity selector
- `/admin/properties/:id` - Edit existing property form

## API Endpoints
- `GET /api/properties` - Get all properties
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

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
