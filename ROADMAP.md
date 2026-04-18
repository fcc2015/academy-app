# ACADEMY SaaS — Production Roadmap

> Generated: 2026-04-10 | Updated: 2026-04-16 (Phase 2) | Status: MVP → Production
> Stack: React 19 + FastAPI + Supabase + PayPal

---

## ✅ SaaS Admin Panel — COMPLETED (April 2026)

| # | Feature | Status | Files |
|---|---------|--------|-------|
| 1 | Analytics Dashboard (MRR, growth, charts) | ✅ | `SaasAnalytics.jsx`, `saas_admin.py` |
| 2 | Academy Detail View (5-tab deep dive) | ✅ | `SaasAcademyDetail.jsx` |
| 3 | Search in Academies | ✅ | `SaasAcademies.jsx` |
| 4 | Email System (5 templates + custom) | ✅ | `SaasEmails.jsx`, `saas_admin.py` |
| 5 | Coupon Codes UI (CRUD + toggle) | ✅ | `SaasCoupons.jsx` |
| 6 | Delete Academy (with confirmation) | ✅ | `SaasAcademies.jsx`, `saas_admin.py` |
| 7 | Invoice PDF (printable HTML) | ✅ | `SaasAcademyDetail.jsx`, `saas_admin.py` |
| 8 | Login As Impersonation (magic link) | ✅ | `SaasAcademyDetail.jsx`, `saas_admin.py` |
| 9 | Bulk Actions (select + mass suspend/activate) | ✅ | `SaasAcademies.jsx`, `saas_admin.py` |
| 10 | Export CSV | ✅ | `SaasAcademies.jsx` |

### SaaS Sidebar (9 pages):
`Dashboard` → `Analytics` → `Academies` → `Domains` → `Academy Plans` → `Coupons` → `Emails` → `Notifications` → `Settings`

---

## Current State Assessment

| Area | Score | Status |
|------|-------|--------|
| Features | 9/10 | 30+ modules, SaaS admin complete |
| Security | 6/10 | Error masking ✅, structured logging ✅, remaining: CSRF, httpOnly |
| UI/UX | 6/10 | SaaS panel polished, admin needs work |
| Mobile | 4/10 | PWA + download page + Capacitor ready |
| Performance | 4/10 | Render cold starts, no caching |
| Testing | 0/10 | Zero tests |
| Monitoring | 0/10 | No error tracking |
| i18n | 7/10 | AR/EN/FR, RTL support |

---

## Phase 1: Security Hardening (Priority: CRITICAL)

### 1.1 Authentication & Session Security
- [x] Move JWT from localStorage to httpOnly cookies (XSS protection)
- [x] Add refresh token rotation (short-lived access + long-lived refresh)
- [x] Server-side rate limiting on `/auth/login` (5 attempts → 15min lockout per IP)
- [x] Email verification code on registration (6-digit OTP via email)
- [x] Password reset flow with email OTP
- [x] Add 2FA/MFA option for admin accounts
- [x] Session invalidation on password change

### 1.2 API Security
- [x] CORS: whitelist only known frontend domains (remove `allow_origins=["*"]`)
- [x] Add CSRF tokens for state-changing requests
- [x] Input validation on ALL endpoints (Pydantic validators — scores 0-10, amounts > 0, Literal enums, length limits, HTML strip)
- [x] Rate limiting: 100 req/min per IP, 30 per user
- [x] Remove hardcoded Supabase anon key from AuthCallback.jsx
- [x] Add Content-Security-Policy (CSP) headers
- [x] Sanitize all user-generated content (XSS prevention — HTML strip on all text fields in all schemas + chat)

### 1.3 Data Protection
- [ ] Encrypt medical data at rest (PII)
- [x] Audit logging for all mutating operations (AuditLogMiddleware in main.py)
- [x] PayPal webhook signature verification (verify_paypal_webhook_signature via PayPal API, PAYPAL_WEBHOOK_ID in .env)
- [x] API versioning (`/v1/` prefix)
- [x] Mask sensitive data in error messages (43+ str(e) leaks fixed, logger.error + safe message pattern across all 30 routers)

---

## Phase 2: Bug Fixes & Stability

### 2.1 Critical Bugs
- [x] Login returns wrong role (reading from user_metadata instead of DB)
- [x] Post-registration redirect to parent instead of admin
- [x] 422 error not showing real Supabase error message
- [x] SaaS login page redirecting parent/coach users
- [x] Client-side only data filtering → server-side parent isolation (assert_parent_owns_player on all data endpoints)
- [x] Chat messages: HTTP polling instead of WebSocket (messages delayed)
- [x] Exception swallowing (`except: pass`) → replaced with logger.warning/error across all routers

### 2.2 Backend Stability
- [x] Replace `print()` with proper `logging` module (all routers + services/audit.py)
- [x] Add structured logging with request IDs (RequestIdMiddleware + RequestIdFilter in main.py)
- [x] Add health check endpoint with DB connectivity test (`/health` endpoint)
- [x] Handle Supabase connection failures gracefully (retry with backoff in _get/_post)
- [x] Add retry logic for transient failures (502/503/504 + network timeouts, exponential backoff)
- [x] Fix async/sync inconsistencies in route handlers (7 functions: auth OTP, qr_auth, payments status, saas email templates)

### 2.3 Frontend Stability  
- [x] Add error boundaries per section (SectionErrorBoundary in Admin/Coach/Parent/SaaS layouts)
- [x] Handle API timeout/network errors with user-friendly messages (authFetch retry + NetworkError class + 30s timeout)
- [x] Fix null checks on data filtering — crash prevention (Array.isArray guards + optional chaining already in AdminDashboard pattern)
- [x] Add loading skeletons instead of spinners (Skeleton.jsx: SkeletonDashboard, SkeletonTable, SkeletonCard, SkeletonStat + useApi hook)

---

## Phase 3: Professional UI/UX Redesign

### 3.1 Design System Foundation
- [x] Create component library (btn, input, badge, table-*, nav-item, modal-* in index.css)
- [x] Consistent spacing system (8px grid via Tailwind)
- [x] Typography scale (Inter + Cairo/Noto Sans Arabic for RTL)
- [x] Color tokens (brand-50→900 + surface-50→900 + status badges in tailwind.config.js)
- [ ] Remove inline styles — use design system classes only
- [ ] Reduce component file sizes (split 400+ line files: FinancesManagement 64KB, PlayersManagement 64KB)

### 3.2 Admin Dashboard Redesign
- [x] Modern KPI cards with color-coded icons
- [x] Revenue chart (AreaChart with Recharts)
- [x] Recent activity feed (timeline style with icons)
- [x] Quick actions bar (sidebar panel with 3 quick links)
- [x] Notification center (NotificationsDropdown component)
- [x] Academy health score widget (ring chart + 4 breakdown bars: payments 40%, attendance 30%, players 15%, evaluations 15%)

### 3.3 Player Profile Redesign
- [x] Photo upload with crop
- [x] Performance radar chart (progression overlay comparing current vs previous evaluation + improvement indicator)
- [x] Attendance heatmap calendar
- [x] Payment history timeline
- [x] Medical card (expandable)
- [x] FUT-style player card (FUTCard.jsx + PlayerBadgeModal.jsx)

### 3.4 Forms & Tables
- [ ] Form library (React Hook Form + Zod validation)
- [ ] Data tables with sorting, filtering, pagination (TanStack Table)
- [ ] Inline editing for quick updates
- [ ] Bulk select & actions
- [x] Export to Excel/PDF with branded header (ExportButtons.jsx)

### 3.5 Animations & Polish
- [x] Page transitions (fadeIn, slideUp, scaleIn, cardEnter, bounceIn in index.css)
- [x] Micro-interactions (hover-lift, premium-shadow, pulse-glow, stagger-children)
- [x] Skeleton loaders for all data-fetching pages (Skeleton.jsx)
- [x] Toast notifications instead of inline alerts (Toast.jsx + ToastProvider)
- [x] Smooth dark mode transition (CSS variables + .dark overrides for bg/text/border/input/shadows + 0.3s transition)
- [x] Empty states with illustrations (EmptyState component in Skeleton.jsx)

### 3.6 RTL & Internationalization
- [x] Use CSS logical properties (RTL overrides in index.css)
- [x] Arabic typography (Cairo/Noto Sans Arabic, optimized line-height)
- [x] Complete all translation keys (~95% coverage — ar/en/fr)
- [x] Date formatting per locale (Intl.DateTimeFormat used in AdminDashboard)
- [x] Number formatting per locale (toLocaleString used)

---

## Phase 4: Mobile App (React Native / Capacitor)

### 4.1 Option A: Capacitor (Recommended for MVP)
- [x] Wrap existing React web app with Capacitor
- [x] Add native splash screen & app icon
- [x] Push notifications (Firebase Cloud Messaging)
- [x] QR code scanner (native camera)
- [x] Biometric authentication (fingerprint/face)
- [x] Offline data caching (SQLite)
- [x] App Store + Google Play submission

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
- [x] WebSocket for real-time chat (replace HTTP polling)
- [ ] Database connection pooling (Supavisor)
- [ ] API response caching (frequently accessed data)

### 7.2 Monitoring & Observability
- [x] Sentry for error tracking (frontend + backend)
- [ ] Uptime monitoring (UptimeRobot / Better Stack)
- [ ] Performance monitoring (response times, slow queries)
- [ ] Alerting: Slack/Discord webhook on critical errors
- [x] Request logging with correlation IDs

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
