# Jupiter Leads - Project TODO

## Database & Backend
- [x] Lead database schema (company, contact, title, email, phone, industry, location, size, status)
- [x] Scrape job schema (parameters, status, progress, results)
- [x] DB migration pushed
- [x] tRPC router: leads CRUD (list, get, create, update, delete)
- [x] tRPC router: leads search & filter
- [x] tRPC router: leads export CSV
- [x] tRPC router: scrape job (create, status, results)
- [x] tRPC router: analytics (totals, by industry, by location, recent activity)
- [x] LLM-powered lead scraping simulation with structured JSON output
- [x] Vitest tests for lead and scrape routers

## Frontend - Design System
- [x] Warm blue color palette in index.css
- [x] Google Fonts (Inter + Sora) in index.html
- [x] DashboardLayout with Jupiter Leads branding and sidebar nav

## Frontend - Pages
- [x] Dashboard / Analytics page (total leads, charts by industry/location, recent activity)
- [x] Lead Database page (searchable table with all fields, pagination)
- [x] Advanced filter panel (industry, location, title, company size, custom)
- [x] CSV export button
- [x] Lead Scraper page (parameter form, progress bar, results preview)
- [x] Lead Detail view (full contact + company info, edit/delete)
- [x] 404 / Not Found page

## Static Results Webpage
- [x] Interactive HTML page with charts and visualizations
- [x] Industry breakdown chart
- [x] Location heatmap / bar chart
- [x] Lead growth over time chart
- [x] Summary stats cards
