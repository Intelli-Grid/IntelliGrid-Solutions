# IntelliGrid - Complete Rebuild Blueprint

## 1. PROJECT OVERVIEW

**IntelliGrid** is a production-ready AI Tools Directory platform featuring 3691+ AI tools with subscription-based access, payment processing, advanced search, and comprehensive user management.

### Key Metrics
- **85+** Frontend Pages
- **132+** React Components  
- **35+** API Routes
- **18** Database Models
- **8+** Third-party Integrations

---

## 2. SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  Frontend (SPA) │────────▶│  Backend API    │────────▶│   MongoDB       │
│  React + Vite   │  REST   │  Express.js     │         │   Database      │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │
        │                           │
        ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│   Vercel CDN    │         │  External APIs  │
│   (Hosting)     │         │  - Clerk Auth   │
│                 │         │  - PayPal       │
└─────────────────┘         │  - Algolia      │
                            │  - Redis        │
                            │  - Sentry       │
                            │  - Brevo Email  │
                            └─────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.2.0 (SPA Framework)
- Vite 6.3.5 (Build Tool)
- Tailwind CSS 3.4.17 (Styling)
- Radix UI (Component Library)
- React Router DOM 6.8.1 (Routing)

**Backend:**
- Node.js 18+ (Runtime)
- Express.js 4.18.2 (Web Framework)
- MongoDB 6.19.0 + Mongoose 8.18.0 (Database)

**Third-Party Services:**
- Clerk (Authentication)
- PayPal + Cashfree (Payments)
- Algolia (Search Engine)
- Redis (Caching)
- Sentry (Error Monitoring)
- Brevo (Email Service)

---

## 3. DATABASE ARCHITECTURE

### Core Models (18 Total)

#### User Management
- **User** - User profiles, authentication, subscription data
- **Achievement** - User achievements and gamification

#### Tools & Content
- **Tool** - AI tool listings (3691+ tools)
- **Category** - Tool categorization
- **Review** - User reviews and ratings
- **BlogPost** - Content management

#### Commerce
- **Order** - Payment transactions
- **Coupon** - Discount codes
- **AffiliatePayout** - Affiliate earnings

#### Analytics
- **AnalyticsEvent** - User interaction tracking
- **SearchLog** - Search analytics
- **AbTestExposure** - A/B testing data
- **AbTestConversion** - Conversion tracking

#### System
- **Favorite** - User favorites
- **Feedback** - User feedback
- **Submission** - Tool submissions
- **WebhookLog** - Webhook event logging
- **AIAgent** - AI agent configurations

---

## 4. FRONTEND ARCHITECTURE

### Directory Structure
```
Frontend/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Application entry point
│   ├── components/             # 132+ React components
│   │   ├── home/              # Homepage components (11)
│   │   ├── ui/                # Reusable UI components (23)
│   │   ├── admin/             # Admin panel components (2)
│   │   ├── analytics/         # Analytics components (2)
│   │   ├── auth/              # Authentication components
│   │   ├── common/            # Common utilities (8)
│   │   ├── dashboard/         # Dashboard components (3)
│   │   ├── layout/            # Layout components (2)
│   │   └── users/             # User management (2)
│   ├── pages/                 # 85+ Page components
│   ├── services/              # API service layer (14 services)
│   ├── hooks/                 # Custom React hooks (3)
│   ├── utils/                 # Utility functions (8)
│   ├── providers/             # Context providers (3)
│   └── styles/                # Global styles
├── public/                    # Static assets (20+ files)
└── index.html                 # HTML template
```

### Key Pages (85 Total)

**Core Pages:**
- HomePage.jsx - Main landing page
- Tools.jsx - Tool directory/listing
- ModernToolDetailPage.jsx - Individual tool details
- SearchPage.jsx - Advanced search interface

**User Management:**
- SignInPage.jsx / SignUpPage.jsx - Authentication
- AccountPage.jsx - User account settings
- DashboardPage.jsx - User dashboard
- UserProfilePage.jsx - Public profiles

**Commerce:**
- CheckoutPage.jsx - Payment checkout
- PaymentPage.jsx - Payment processing
- PricingPage.jsx - Subscription pricing
- UpgradePage.jsx - Membership upgrades
- MembershipPage.jsx - Membership management

**Admin:**
- AdminToolsPage.jsx - Tool management
- EnhancedAdminPanel.jsx - Admin dashboard
- UserManagement.jsx - User administration
- AnalyticsPage.jsx - Analytics dashboard

**Content:**
- ModernBlogPage.jsx / BlogPage.jsx - Blog listing
- BlogPostPage.jsx - Individual blog posts
- ModernCategoryPage.jsx - Category pages
- CategoriesPage.jsx - All categories

**Community:**
- CommunityPage.jsx - Community features
- AffiliateDashboard.jsx - Affiliate program
- ReferralPage.jsx - Referral system
- AchievementsPage.jsx - User achievements
- CorrectionsPage.jsx - Content corrections

**Legal & Info:**
- AboutPage.jsx - About page
- PrivacyPolicy.jsx - Privacy policy
- TermsAndConditions.jsx - Terms of service
- RefundPolicy.jsx / ReturnPolicy.jsx - Policies
- ContactPage.jsx - Contact form
- SupportPage.jsx - Support tickets

---

## 5. BACKEND ARCHITECTURE

### Directory Structure
```
Backend/
├── src/
│   ├── app.js                 # Main Express application
│   ├── controllers/           # Request handlers (10)
│   ├── routes/                # API route definitions (35)
│   ├── models/                # Mongoose schemas (18)
│   ├── services/              # Business logic (35)
│   ├── middleware/            # Express middleware (14)
│   ├── config/                # Configuration files (7)
│   └── utils/                 # Utility functions (9)
├── migration/                 # Database migration scripts
└── scripts/                   # Utility scripts
```

### API Routes (35 Total)

**Tools & Content:**
- `/api/v1/tools` - Tool CRUD, search, trending, favorites
- `/api/v1/categories` - Category management
- `/api/v1/reviews` - Review system
- `/api/v1/search` - Advanced search

**User & Auth:**
- `/api/v1/auth` - Authentication endpoints
- `/api/v1/user` - User profile management
- `/api/v1/achievements` - Achievement system

**Commerce:**
- `/api/v1/subscriptions` - Subscription management
- `/api/v1/paypal` - PayPal integration
- `/api/v1/payment` - Payment processing
- `/api/v1/coupons` - Coupon management
- `/api/v1/membership` - Membership tiers
- `/api/v1/affiliate` - Affiliate program

**Admin:**
- `/api/v1/admin` - Admin dashboard
- `/api/v1/admin-tools` - Admin tool management
- `/api/v1/tier` - Tier management

**Analytics:**
- `/api/v1/analytics` - Event tracking
- `/api/v1/metrics` - Performance metrics

**System:**
- `/api/v1/webhooks` - Webhook handlers
- `/api/v1/support` - Support tickets
- `/api/v1/health` - Health checks
- `/api/v1/flags` - Feature flags

**Other:**
- `/api/v1/home` - Homepage data
- `/api/v1/legal` - Legal documents
- `/api/v1/brevo` - Email service
- `/api/v1/outbound` - External links

---

## 6. KEY FEATURES & COMPONENTS

### Authentication & Authorization
- Clerk-based OAuth authentication
- JWT token management
- Role-based access control (User, Premium, Admin)
- Session management with Redis

### Payment Processing
- PayPal integration (sandbox + live)
- Cashfree/PhonePe integration
- Subscription management (Free, Basic, Premium, Enterprise)
- Coupon/discount system
- Refund handling

### Search & Discovery
- Algolia-powered search
- Real-time search suggestions
- Category-based filtering
- Advanced filters (pricing, features, ratings)
- Trending tools
- Staff picks
- Tool of the Day

### User Features
- Favorites/bookmarks
- Tool reviews and ratings
- Recently viewed tools
- Usage tracking
- Achievement system
- Referral program
- Affiliate dashboard

### Admin Features
- Tool moderation
- User management
- Analytics dashboard
- Content management
- Support ticket system
- Coupon management
- Feedback monitoring

### Analytics & Monitoring
- Custom event tracking
- Search analytics
- Conversion tracking
- A/B testing framework
- Performance monitoring (Sentry)
- Error tracking
- Usage limits enforcement

---

## 7. THIRD-PARTY INTEGRATIONS

### Clerk Authentication
**Purpose:** User authentication and management
**Features:**
- OAuth providers (Google, GitHub, etc.)
- Session management
- Webhook events for user lifecycle
- JWT token generation

### PayPal Payments
**Purpose:** Payment processing
**Features:**
- Order creation
- Payment capture
- Subscription billing
- Webhook notifications
**Endpoints:** Sandbox + Production

### Algolia Search
**Purpose:** Real-time search engine
**Features:**
- Index management
- Search API
- Faceted search
- Analytics

### Redis Caching
**Purpose:** Performance optimization
**Features:**
- Session storage
- API response caching
- Rate limiting
- Temporary data storage

### Sentry Monitoring
**Purpose:** Error tracking and performance
**Features:**
- Error logging
- Performance monitoring
- Release tracking
- User feedback

### Brevo Email Service
**Purpose:** Transactional emails
**Features:**
- Welcome emails
- Password reset
- Payment confirmations
- Newsletter

---

## 8. DEPLOYMENT INFRASTRUCTURE

### Frontend Deployment (Vercel)
- **Platform:** Vercel
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment:** Production
- **CDN:** Global edge network

### Backend Deployment (Render)
- **Platform:** Render
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node.js 18
- **Port:** 10000

### Database (MongoDB Atlas)
- **Provider:** MongoDB Atlas
- **Clusters:** Production + Development
- **Backup:** Automated daily backups
- **Replication:** Multi-region

### Environment Variables

**Frontend (.env):**
```
VITE_API_BASE_URL
VITE_CLERK_PUBLISHABLE_KEY
VITE_ALGOLIA_APP_ID
VITE_ALGOLIA_SEARCH_KEY
VITE_PAYPAL_CLIENT_ID
VITE_SENTRY_DSN
```

**Backend (.env):**
```
MONGODB_URI
NODE_ENV
PORT
CLERK_SECRET_KEY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
ALGOLIA_APP_ID
ALGOLIA_ADMIN_KEY
REDIS_URL
BREVO_API_KEY
SENTRY_DSN
```

---

## 9. SECURITY FEATURES

- **Rate Limiting:** Express-rate-limit on all endpoints
- **Input Validation:** Express-validator for request validation
- **CORS:** Configured for frontend domain
- **Helmet:** Security headers
- **Webhook Verification:** Signature validation (PayPal, Clerk)
- **Authentication:** Clerk JWT verification
- **Data Sanitization:** Input sanitization
- **Error Handling:** Centralized error handling
- **Secrets Management:** Environment variables
- **SQL Injection Prevention:** Mongoose ORM
- **XSS Protection:** DOMPurify on frontend

---

## 10. REBUILD PHASES

### Phase 1: Foundation Setup (Week 1)
1. Initialize Git repository
2. Set up development environment
3. Configure MongoDB database
4. Create base project structure
5. Set up environment variables
6. Install core dependencies

### Phase 2: Backend Core (Week 2-3)
1. Set up Express server
2. Configure middleware
3. Implement database models
4. Create authentication system
5. Build core API routes
6. Add error handling

### Phase 3: Third-Party Integrations (Week 4)
1. Integrate Clerk authentication
2. Set up PayPal payments
3. Configure Algolia search
4. Set up Redis caching
5. Integrate Sentry monitoring
6. Configure email service

### Phase 4: Frontend Foundation (Week 5-6)
1. Set up React + Vite
2. Configure Tailwind CSS
3. Implement routing
4. Create layout components
5. Build reusable UI components
6. Set up state management

### Phase 5: Core Features (Week 7-9)
1. Build tool listing pages
2. Implement search functionality
3. Create user dashboard
4. Build authentication flows
5. Implement payment checkout
6. Add review system

### Phase 6: Advanced Features (Week 10-11)
1. Admin panel
2. Analytics dashboard
3. Affiliate system
4. Achievement system
5. Blog functionality
6. Content management

### Phase 7: Testing & QA (Week 12)
1. Unit tests
2. Integration tests
3. E2E tests
4. Performance testing
5. Security audit
6. Accessibility testing

### Phase 8: Deployment (Week 13)
1. Production environment setup
2. Database migration
3. Frontend deployment to Vercel
4. Backend deployment to Render
5. DNS configuration
6. Monitoring setup

### Phase 9: Launch & Monitoring (Week 14)
1. Final smoke tests
2. Production launch
3. Monitor logs and errors
4. Performance optimization
5. User feedback collection

---

## 11. DEVELOPMENT WORKFLOW

### Local Development
```bash
# Backend
cd Backend
npm install
cp .env.example .env
# Configure .env with credentials
npm run dev

# Frontend
cd Frontend
npm install
cp .env.example .env
# Configure .env with API endpoints
npm run dev
```

### Testing
```bash
# Backend tests
cd Backend
npm test
npm run test:coverage

# Frontend tests
cd Frontend
npm run test
npm run test:e2e
```

### Deployment
```bash
# Frontend build
cd Frontend
npm run build

# Backend start
cd Backend
npm start
```

---

## 12. CRITICAL SUCCESS FACTORS

1. **Database:** Ensure MongoDB is properly configured with indexes
2. **Authentication:** Clerk integration must be configured correctly
3. **Payments:** PayPal webhook endpoints must be accessible
4. **Search:** Algolia indexes must be synced with database
5. **Caching:** Redis should be optional with fallback
6. **Monitoring:** Sentry must be configured for error tracking
7. **Email:** Brevo templates must be created
8. **Security:** Rate limiting and validation on all endpoints
9. **Performance:** Frontend bundle size optimization
10. **Testing:** Comprehensive test coverage before launch

---

## 13. ESTIMATED RESOURCES

**Development Team:**
- 1-2 Full-stack developers
- 1 DevOps engineer
- 1 QA engineer
- 1 UI/UX designer (optional)

**Timeline:** 13-14 weeks

**Budget Considerations:**
- MongoDB Atlas: $50-200/month
- Vercel: Free tier or $20/month
- Render: $7-25/month
- Clerk: Free tier or $25/month
- Algolia: Free tier or $0.50/1000 requests
- Redis: $15-30/month
- Domain: $15/year

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-01  
**Status:** Ready for Implementation
