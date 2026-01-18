# Muros - Plataforma Inmobiliaria

## Overview
Muros is a Spanish (Mexico) real estate web platform for a company specializing in apartment developments. The platform features an administrative system for managing property developments and a public-facing search interface with advanced filtering capabilities.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Shadcn/UI with custom Muros brand theming
- **Styling**: Tailwind CSS with custom design tokens

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Storage**: In-memory storage with sample data
- **API**: RESTful endpoints for property CRUD operations

### Data Model
- **Properties**: Apartments with full details (price, location, size, amenities, images)
- **Users**: Basic user authentication schema (not implemented in MVP)

## Pages

### Public Pages
- `/` - Home page with property search and advanced filters
- `/property/:id` - Property detail page with image gallery and contact info

### Admin Pages  
- `/admin` - Dashboard with statistics and property management table
- `/admin/properties/new` - Create new property form
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

## Running the Project
The application runs on port 5000 using the `npm run dev` command.

## Recent Changes
- Implemented complete property CRUD functionality
- Added public search page with advanced filtering (price range, bedrooms, bathrooms, area, city, property type)
- Created admin dashboard with property statistics and management table
- Applied Muros brand colors and typography
- Added sample property data for demonstration
