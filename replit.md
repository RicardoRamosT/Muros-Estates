# Muros - Plataforma Inmobiliaria

## Overview
Muros is a real estate web platform designed for apartment development companies in Mexico. It provides a comprehensive solution for managing property listings, client interactions, and sales processes. The platform features an administrative dashboard with role-based access control and a public-facing interface for property search and lead capture. Inspired by popular real estate and rental platforms, Muros aims to streamline operations and enhance the user experience for both administrators and prospective buyers.

## User Preferences
No specific user preferences were provided in the original document.

## System Architecture

### Frontend
- **Framework**: React with Vite and TypeScript
- **Routing**: Wouter with protected routes
- **State Management**: TanStack React Query
- **Authentication**: Custom AuthProvider with session token management
- **UI Components**: Shadcn/UI with custom Muros brand theming
- **Styling**: Tailwind CSS with custom design tokens, Montserrat (headings), Open Sans (body)
- **UI/UX Decisions**: Zillow/Airbnb inspired design, all interface text in Spanish, custom golden icons, cascading city/zone filters, visual amenity selectors, badge-style feature toggles.
- **Key Features**:
    - **Public Interface**: Home page with lead capture, search filters, property grid, and dedicated property detail pages.
    - **Admin Dashboard**: Management for developers, developments, clients, users, and typologies (property units).
    - **Excel-style Typology Spreadsheet**: Inline editing for 50+ fields, calculated fields, real-time WebSocket synchronization, and advanced column filtering with sort, search, and checkbox options.
    - **Dynamic Filtering**: Sliders for price, area, delivery timeline, and down payment percentage, with automatic min/max adjustment.
    - **Media Management**: Individual typology-based image and video uploads with previews.
    - **Role-Based Navigation**: Admin header adapts based on user roles and permissions.
    - **Document Management**: Hierarchical system with tokenized public sharing, access control, and expiration options.

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: bcrypt for password hashing, session-based authentication via Authorization header tokens.
- **API**: RESTful endpoints with role-based access control middleware.
- **WebSocket**: Native `ws` library for real-time typology updates.

### Data Model
- **Users**: Staff accounts with roles (Admin, Perfilador, Asesor, Actualizador) and granular, two-level fine-grained permissions.
- **Clients**: Leads from web forms or manual creation, with financial fields and distinct client management from prospects.
- **Properties/Typologies**: Detailed apartment listings, primary data source for public pages, including 50+ fields across 10 sections (General, Price, Distribution, Payment Scheme, Post-Delivery Costs, Mortgage Credit, Maintenance, Rent, Investment, Plusvalía).
- **Constants**: Centralized configuration for developers, developments, cities, zones, development types, amenities, and features, managed via dedicated admin catalogs.

### System Design Choices
- **Spreadsheet Utility System**: Reusable utility functions for cell styling, formatting (currency, percent, area, date), and a defined array of 19 formulas for calculated fields in typologies.
- **Column Filter System**: Generic, reusable popover-based filter component with search, multi-select, and sort capabilities applied across all admin spreadsheets.
- **Formula Tooltip System**: Displays formula and description on hover for calculated fields for user clarity.
- **Typology Management Enhancements**: Nullable location fields for empty row creation, "Sin Asignar" option for dropdowns, alphabetical sorting, dynamic "Vistas" integration from developments to typologies, row-level batch saving with auto-save, active row highlighting, and a 3-state "Activo" button for publication status (No-rojo, No-amarillo, Sí-verde) with completeness validation.
- **Conditional Logic**: Dynamic field clearing based on boolean selections, conditional blocking of development types, and calculated fields derived from global defaults or other data.

## External Dependencies
- **PostgreSQL**: Relational database for persistent data storage.
- **Vite**: Frontend build tool.
- **Wouter**: Client-side routing library.
- **TanStack React Query**: Data fetching and state management.
- **Shadcn/UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **ws**: WebSocket library for real-time communication.