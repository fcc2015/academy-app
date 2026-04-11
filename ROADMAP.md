# ACADEMY SaaS — Production Roadmap

> Generated: 2026-04-10 | Status: MVP → Production
> Stack: React 19 + FastAPI + Supabase + PayPal

---

## Current State Assessment

| Area | Score | Status |
|------|-------|--------|
| Features | 8/10 | 24+ modules implemented |
| Security | 3/10 | Critical vulnerabilities |
| UI/UX | 5/10 | Functional but not polished |
| Mobile | 2/10 | PWA only, no native app |
| Performance | 4/10 | Render cold starts, no caching |
| Testing | 0/10 | Zero tests |
| Monitoring | 0/10 | No error tracking |

---

## Phase 1: Security Hardening (Priority: CRITICAL)

### 1.1 Authentication & Session Security
- [ ] Move JWT from localStorage to httpOnly cookies (XSS protection)
- [ ] Add refresh token rotation (short-lived access + long-lived refresh)
- [ ] Server-side rate limiting on `/auth/login` (5 attempts → 15min lockout per IP)
- [ ] Email verification code on registration (6-digit OTP via email)
- [ ] Password reset flow with email OTP
- [ ] Add 2FA/MFA option for admin accounts
- [ ] Session invalidation on password change

### 1.2 API Security
- [ ] CORS: whitelist only known frontend domains (remove `allow_origins=["*"]`)
- [ ] Add CSRF tokens for state-changing requests
- [ ] Input validation on ALL endpoints (Pydantic validators)
- [ ] Rate limiting: 100 req/min per IP, 30 per user
- [ ] Remove hardcoded Supabase anon key from AuthCallback.jsx
- [ ] Add Content-Security-Policy (CSP) headers
- [ ] Sanitize all user-generated content (XSS prevention)

### 1.3 Data Protection
- [ ] Encrypt medical data at rest (PII)
- [ ] Audit logging for all financial operations (create/edit/delete)
- [ ] PayPal webhook signature verification
- [ ] API versioning (`/v1/` prefix)
- [ ] Mask sensitive data in error messages (no DB structure leaks)

---

## Phase 2: Bug Fixes & Stability

### 2.1 Critical Bugs
- [x] Login returns wrong role (reading from user_metadata instead of DB)
- [x] Post-registration redirect to parent instead of admin
- [x] 422 error not showing real Supabase error message
- [x] SaaS login page redirecting parent/coach users
- [ ] Client-side only data filtering (parent can see other players' data via DevTools)
- [ ] Chat messages: HTTP polling instead of WebSocket (messages delayed)
- [ ] Exception swallowing (`except: pass`) hiding real errors in backend

### 2.2 Backend Stability
- [ ] Replace `print()` with proper `logging` module
- [ ] Add structured logging with request IDs
- [ ] Add health check endpoint with DB connectivity test
- [ ] Handle Supabase connection failures gracefully
- [ ] Add retry logic for transient failures (network timeouts)
- [ ] Fix async/sync inconsistencies in route handlers

### 2.3 Frontend Stability  
- [ ] Add error boundaries per section (not just global)
- [ ] Handle API timeout/network errors with user-friendly messages
- [ ] Fix null checks on data filtering (crash prevention)
- [ ] Add loading skeletons instead of spinners

---

## Phase 3: Professional UI/UX Redesign

### 3.1 Design System Foundation
- [ ] Create component library (Button, Input, Card, Modal, Badge, Table)
- [ ] Consistent spacing system (8px grid)
- [ ] Typography scale (Inter/Cairo for Arabic)
- [ ] Color tokens (brand, surface, status colors)
- [ ] Remove inline styles — use Tailwind classes only
- [ ] Reduce component file sizes (split 400+ line files)

### 3.2 Admin Dashboard Redesign
- [ ] Modern KPI cards with sparkline charts
- [ ] Revenue chart (line/bar — Recharts or Chart.js)
- [ ] Recent activity feed (timeline style)
- [ ] Quick actions bar
- [ ] Notification center (slide-out panel)
- [ ] Academy health score widget

### 3.3 Player Profile Redesign
- [ ] Photo upload with crop
- [ ] Performance radar chart
- [ ] Attendance heatmap calendar
- [ ] Payment history timeline
- [ ] Medical card (expandable)
- [ ] FUT-style player card (already exists, polish it)

### 3.4 Forms & Tables
- [ ] Form library (React Hook Form + Zod validation)
- [ ] Data tables with sorting, filtering, pagination (TanStack Table)
- [ ] Inline editing for quick updates
- [ ] Bulk select & actions
- [ ] Export to Excel/PDF with branded header

### 3.5 Animations & Polish
- [ ] Page transitions (Framer Motion)
- [ ] Micro-interactions (button hover, card lift)
- [ ] Skeleton loaders for all data-fetching pages
- [ ] Toast notifications instead of inline alerts
- [ ] Smooth dark mode transition
- [ ] Empty states with illustrations

### 3.6 RTL & Internationalization
- [ ] Use CSS logical properties (margin-inline, padding-inline)
- [ ] Arabic typography (Cairo/Noto Sans Arabic)
- [ ] Complete all translation keys (currently ~70% coverage)
- [ ] Date formatting per locale (Intl.DateTimeFormat)
- [ ] Number formatting per locale

---

## Phase 4: Mobile App (React Native / Capacitor)

### 4.1 Option A: Capacitor (Recommended for MVP)
- [ ] Wrap existing React web app with Capacitor
- [ ] Add native splash screen & app icon
- [ ] Push notifications (Firebase Cloud Messaging)
- [ ] QR code scanner (native camera)
- [ ] Biometric authentication (fingerprint/face)
- [ ] Offline data caching (SQLite)
- [ ] App Store + Google Play submission

### 4.2 Option B: React Native (Long-term)
- [ ] Shared API layer with web app
- [ ] Native navigation (React Navigation)
- [ ] Native components (faster, smoother)
- [ ] Background sync for attendance
- [ ] Deep linking (open specific player/match)
- [ ] Native share functionality

### 4.3 Mobile-Specific Features
- [ ] Parent app: attendance alerts, payment reminders, match notifications
- [ ] Coach app: quick attendance marking, evaluation forms
- [ ] GPS check-in for training sessions
- [ ] Photo/video capture for evaluations
- [ ] Offline mode for poor connectivity areas

---

## Phase 5: Email & Notifications

### 5.1 Email System
- [ ] Email verification on registration (6-digit code, 10min expiry)
- [ ] Password reset via email OTP
- [ ] Welcome email after academy creation
- [ ] Payment receipt email (auto-generated)
- [ ] Subscription renewal reminder (7 days before)
- [ ] Overdue payment notification (3 days after)
- [ ] Monthly academy report email (player count, revenue, attendance %)
- [ ] Provider: Resend / SendGrid / AWS SES

### 5.2 Push Notifications
- [ ] Web push (service worker)
- [ ] Mobile push (FCM)
- [ ] Notification preferences per user
- [ ] Types: payment due, new message, attendance marked, evaluation ready

### 5.3 WhatsApp Integration (Morocco-specific)
- [ ] Payment reminders via WhatsApp Business API
- [ ] Attendance alerts to parents
- [ ] Match schedule notifications

---

## Phase 6: Advanced Features

### 6.1 Analytics & Reporting
- [ ] Admin analytics dashboard (Chart.js / Recharts)
- [ ] Player progression over time (evaluation trends)
- [ ] Revenue analytics (MRR, churn, growth)
- [ ] Attendance analytics (best/worst days, seasonal trends)
- [ ] Coach performance metrics
- [ ] PDF report generation (branded, exportable)

### 6.2 Subscription & Billing Engine
- [ ] Auto-renewal reminders
- [ ] Coupon/promo codes (already started)
- [ ] Family discount (multiple children)
- [ ] Seasonal pricing (summer camps)
- [ ] Payment methods: PayPal, Stripe, Bank transfer, CashPlus/Wafacash
- [ ] Invoice PDF generation with academy branding
- [ ] Tax calculation per country

### 6.3 Advanced Player Features
- [ ] Player scouting module
- [ ] Video clips attachment to evaluations
- [ ] Parent-coach messaging (already exists, enhance)
- [ ] Transfer/departure tracking
- [ ] Age category auto-assignment by birth date
- [ ] Attendance streaks & rewards

### 6.4 Academy Branding
- [ ] Custom logo upload
- [ ] Custom color theme per academy
- [ ] Custom domain (already started)
- [ ] White-label option (remove SaaS branding)
- [ ] Public academy page (for parents to find & register)

---

## Phase 7: Infrastructure & DevOps

### 7.1 Backend Upgrade
- [ ] Move from Render free tier to paid (no cold starts)
- [ ] Add Redis for caching + rate limiting
- [ ] Background job queue (Celery or ARQ)
- [ ] WebSocket for real-time chat (replace HTTP polling)
- [ ] Database connection pooling (Supavisor)
- [ ] API response caching (frequently accessed data)

### 7.2 Monitoring & Observability
- [ ] Sentry for error tracking (frontend + backend)
- [ ] Uptime monitoring (UptimeRobot / Better Stack)
- [ ] Performance monitoring (response times, slow queries)
- [ ] Alerting: Slack/Discord webhook on critical errors
- [ ] Request logging with correlation IDs

### 7.3 CI/CD Pipeline
- [ ] GitHub Actions: lint → test → build → deploy
- [ ] Staging environment (preview deploys on Netlify)
- [ ] Database migration management (Alembic)
- [ ] Automated security scanning (Snyk / Dependabot)

### 7.4 Testing
- [ ] Unit tests (Vitest for frontend, pytest for backend)
- [ ] Integration tests (API endpoint testing)
- [ ] E2E tests (Playwright)
- [ ] Target: 80%+ code coverage
- [ ] Pre-commit hooks (lint + format)

---

## Phase 8: Scale & Growth

### 8.1 Multi-Region
- [ ] CDN for static assets (CloudFlare)
- [ ] Database read replicas for heavy queries
- [ ] Multi-language support expansion (Spanish, English, Wolof)

### 8.2 Marketplace
- [ ] Template playbooks for coaches
- [ ] Training plan library
- [ ] Evaluation criteria templates
- [ ] Shareable between academies

### 8.3 AI Features (Tasteful)
- [ ] Smart player recommendation (squad composition)
- [ ] Attendance prediction (identify at-risk players)
- [ ] Financial forecasting (revenue projections)
- [ ] Auto-translation for multilingual academies

---

## Priority Order (What to do first)

| # | Phase | Timeline | Impact |
|---|-------|----------|--------|
| 1 | Security Hardening | Week 1-3 | Prevents data breach |
| 2 | Bug Fixes | Week 1-2 (parallel) | Users can actually use the app |
| 3 | Email Verification | Week 2-3 | Registration flow complete |
| 4 | UI/UX Redesign | Week 3-8 | Professional appearance |
| 5 | Mobile App (Capacitor) | Week 6-10 | App Store presence |
| 6 | Infrastructure Upgrade | Week 4-6 | Reliability |
| 7 | Advanced Features | Week 8-16 | Competitive advantage |
| 8 | Scale & Growth | Month 4+ | Market expansion |

---

## Competitor: CopafaCil

Key features to match:
- Native mobile app (iOS + Android)
- Real-time match tracking
- Player statistics dashboard
- Team management
- Calendar & scheduling
- Photo galleries
- News/announcements feed
- Parent portal with payment
- Push notifications
- Offline support

**Our advantages over CopafaCil:**
- Multi-tenant SaaS (one platform, many academies)
- Financial management (CopafaCil lacks this)
- Medical records
- Chat system
- Custom domains
- PayPal integration
- Arabic/RTL first
