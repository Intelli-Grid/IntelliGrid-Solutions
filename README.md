# 🚀 IntelliGrid - AI Tools Directory Platform

> A comprehensive, production-ready AI tools directory with 3,690+ tools, real-time search, payment processing, and admin panel.

[![Status](https://img.shields.io/badge/status-production%20ready-success)]()
[![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-green)]()
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-blue)]()
[![Database](https://img.shields.io/badge/database-MongoDB%20Atlas-brightgreen)]()
[![Search](https://img.shields.io/badge/search-Algolia-5468ff)]()

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [License](#license)

---

## 🎯 Overview

IntelliGrid is a full-stack AI tools directory platform featuring:
- **3,690 AI tools** ready to browse
- **Real-time search** powered by Algolia
- **User authentication** via Clerk
- **Payment processing** with PayPal & Cashfree
- **Admin panel** for complete management
- **95% automation** for minimal manual intervention

---

## ✨ Features

### User Features
- ✅ Browse 3,690+ AI tools
- ✅ Real-time search with filters
- ✅ User authentication & profiles
- ✅ Favorites system
- ✅ Tool ratings & reviews
- ✅ Subscription plans (Free, Pro Monthly, Pro Yearly)
- ✅ Secure payment processing

### Admin Features
- ✅ Dashboard with real-time stats
- ✅ Tool approval/rejection workflow
- ✅ Review moderation
- ✅ User management
- ✅ Payment transaction tracking
- ✅ Analytics & reports
- ✅ Platform settings

### Technical Features
- ✅ RESTful API (35+ endpoints)
- ✅ MongoDB Atlas cloud database
- ✅ Redis caching
- ✅ Algolia search integration
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Error handling
- ✅ Input validation
- ✅ CORS configuration
- ✅ Security headers (Helmet)

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Caching:** Redis
- **Authentication:** Clerk
- **Payments:** PayPal SDK, Cashfree SDK
- **Search:** Algolia
- **Security:** Helmet, CORS, JWT, Bcrypt

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Authentication:** Clerk React
- **Search:** Algolia InstantSearch
- **HTTP Client:** Axios
- **Icons:** Lucide React

### Infrastructure
- **Database:** MongoDB Atlas
- **Search Engine:** Algolia
- **Cache:** Redis
- **Hosting:** Railway (Backend), Vercel (Frontend)
- **Auth Provider:** Clerk
- **Payment Gateways:** PayPal, Cashfree

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account
- Clerk account
- Algolia account
- PayPal/Cashfree accounts (for payments)

### Local Development

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd "INTELLIGRID NEW"
```

2. **Backend Setup**
```bash
cd Backend
npm install
cp .env.example .env
# Configure .env with your credentials
npm run dev
```

3. **Frontend Setup**
```bash
cd Frontend
npm install
cp .env.example .env
# Configure .env with your credentials
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend: http://localhost:10000
- API: http://localhost:10000/api/v1

---

## 📚 Documentation

Comprehensive documentation is available in the `/brain` directory:

### Essential Guides
1. **setup_guide.md** - Local development setup
2. **deployment_guide.md** - Production deployment
3. **automation_guide.md** - Automated workflows
4. **final_summary.md** - Complete project overview

### Additional Documentation
- **project_status.md** - Current status & features
- **integration_testing.md** - Testing procedures
- **task.md** - Development progress tracker
- **walkthrough.md** - Development walkthrough

---

## 🌐 Deployment

### Quick Deploy

**Backend (Railway):**
```bash
railway login
railway init
railway up
```

**Frontend (Vercel):**
```bash
vercel login
vercel --prod
```

### Detailed Instructions
See **deployment_guide.md** for complete step-by-step deployment instructions.

---

## 📊 Project Statistics

- **Total Tools:** 3,690
- **API Endpoints:** 35+
- **Frontend Pages:** 8
- **Database Models:** 18
- **Lines of Code:** ~9,000
- **Automation Level:** 95%

---

## 🔐 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=10000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=your_mongodb_uri
CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
PAYPAL_CLIENT_ID=your_paypal_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
CASHFREE_APP_ID=your_cashfree_id
CASHFREE_SECRET_KEY=your_cashfree_secret
ALGOLIA_APP_ID=your_algolia_id
ALGOLIA_ADMIN_KEY=your_algolia_key
REDIS_URL=redis://localhost:6379
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:10000/api/v1
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_ALGOLIA_APP_ID=your_algolia_id
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_key
```

---

## 🎯 Roadmap

### ✅ Completed
- Full-stack application
- 3,690 tools imported
- Real-time search
- User authentication
- Payment processing
- Admin panel
- Documentation

### 🔄 Future Enhancements
- Mobile app (React Native)
- Advanced analytics
- AI-powered recommendations
- Tool comparison feature
- API for third-party integrations
- Multi-language support

---

## 📝 License

This project is proprietary and confidential.

---

## 🤝 Support

For issues or questions:
- Check the documentation
- Review the automation guide
- Contact the development team

---

## 🎉 Acknowledgments

Built with:
- React & Vite
- Node.js & Express
- MongoDB Atlas
- Algolia
- Clerk
- PayPal & Cashfree
- And many other amazing open-source projects

---

**Status:** ✅ Production Ready | **Version:** 1.0.0 | **Last Updated:** February 2026
