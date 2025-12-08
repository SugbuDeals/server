# Changelog

All notable changes to SugbuDeals Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2024

### Added

#### Core Features
- **Authentication & Authorization System**
  - JWT-based authentication with Bearer token support
  - Role-based access control (CONSUMER, RETAILER, ADMIN)
  - Local authentication strategy with bcrypt password hashing
  - Protected routes with JWT and role guards
  - User registration and login endpoints

- **User Management**
  - User profile management with CRUD operations
  - User role assignment and management
  - Profile image support
  - User creation timestamp tracking

- **Store Management**
  - Complete store CRUD operations
  - Store verification status system (UNVERIFIED, VERIFIED)
  - Location-based store data (latitude, longitude, address, city, state, country, postal code)
  - Store image and banner support
  - Store activation/deactivation
  - Geospatial indexing for efficient location queries
  - Store owner relationship management

- **Product Management**
  - Full product lifecycle management
  - Product categorization support
  - Stock tracking and management
  - Product activation/deactivation
  - Product image support
  - Price management with decimal precision
  - Product-store relationship management

- **Category Management**
  - Category CRUD operations
  - Category-product relationships
  - Timestamp tracking (created, updated)

- **Promotion Management**
  - Promotion creation and management
  - Multiple promotion types support
  - Time-based promotions with start/end dates
  - Discount percentage tracking
  - Product-promotion relationships
  - Promotion activation status

- **Bookmark System**
  - Store bookmarks for users
  - Product bookmarks for users
  - Unique bookmark constraints to prevent duplicates
  - Bookmark creation timestamp tracking

- **Subscription Management**
  - Subscription plan management (FREE, BASIC, PREMIUM)
  - User subscription tracking
  - Billing cycle support (MONTHLY, YEARLY)
  - Subscription status management (ACTIVE, CANCELLED, EXPIRED, PENDING)
  - Subscription analytics and reporting
  - Subscription start/end date tracking
  - Cancellation support with timestamp

- **Notification System**
  - Comprehensive notification types (product, promotion, store, subscription events)
  - Read/unread notification tracking
  - Notification creation and read timestamps
  - Entity references (product, store, promotion)
  - Scheduled notification generation via cron jobs
  - Memory-optimized notification scheduler for low-resource environments
  - Batch processing for efficient notification delivery
  - Promotion ending soon alerts (24-hour window)
  - Subscription ending soon alerts (48-hour window)
  - Automatic promotion and subscription expiration notifications

- **AI-Powered Features**
  - Natural language chat interface with multi-turn conversation support
  - Intelligent product recommendations using Groq SDK
  - Store recommendations with location-based filtering
  - Promotion recommendations
  - Similar products discovery
  - AI agent with automatic intent detection (Product/Store/Promotion/Chat)
  - Structured tool calling following Groq best practices
  - Location-aware recommendations considering relevance and distance
  - AI-generated explanations for recommendations

- **File Management**
  - File upload endpoints
  - File serving capabilities
  - File management operations

#### Technical Infrastructure
- **Database & ORM**
  - Prisma ORM integration with PostgreSQL
  - Type-safe database client generation
  - Comprehensive database schema with relationships
  - Database migration support
  - Custom Prisma client output path configuration

- **API Documentation**
  - Swagger/OpenAPI documentation at `/api` endpoint
  - Interactive API testing interface
  - JWT Bearer token authentication in Swagger
  - Organized API tags for all resource groups
  - Optional Swagger disabling for low-memory environments
  - Comprehensive endpoint documentation with examples

- **Scheduled Tasks**
  - Cron job support via @nestjs/schedule
  - Hourly notification scheduler
  - Automated promotion and subscription monitoring

- **Validation & Security**
  - Global validation pipes with class-validator
  - DTO validation for all endpoints
  - CORS configuration for cross-origin requests
  - Secure password hashing with bcrypt
  - JWT token-based authentication

- **Development Tools**
  - ESLint configuration with Prettier integration
  - Jest testing framework setup
  - End-to-end testing support
  - Test coverage reporting
  - TypeScript strict mode configuration
  - Source map support for debugging

### Technical Details

#### Dependencies
- **Framework**: NestJS 11.0.1
- **Database**: Prisma 6.14.0 with PostgreSQL
- **Authentication**: Passport.js with JWT and Local strategies
- **AI Integration**: Groq SDK 0.32.0 and Groq 4.10.1
- **Validation**: class-validator 0.14.2, class-transformer 0.5.1
- **Documentation**: Swagger/OpenAPI 11.2.0
- **Scheduling**: @nestjs/schedule 6.0.1
- **Security**: bcrypt 6.0.0

#### Performance Optimizations
- Memory-efficient notification scheduler optimized for 512MB RAM environments
- Batch processing with configurable batch sizes (50 records, 100 notifications)
- Cursor-based pagination for large datasets
- Selective field queries to minimize memory usage
- Bulk notification creation
- Parallel processing of notification checks

#### Database Schema
- 11 main models: User, Store, Product, Category, Promotion, StoreBookmark, ProductBookmark, Subscription, UserSubscription, Notification
- 5 enums: UserRole, StoreVerificationStatus, SubscriptionPlan, SubscriptionStatus, BillingCycle, NotificationType
- Comprehensive indexing for performance (geospatial, user-based, timestamp-based)
- Cascade delete/update relationships for data integrity

### API Endpoints

The API provides RESTful endpoints for:
- **Auth**: `/auth/register`, `/auth/login`
- **Users**: User profile management
- **Stores**: Store CRUD, status management, location-based queries
- **Products**: Product CRUD, status management, category filtering
- **Categories**: Category management
- **Promotions**: Promotion management, time-based queries
- **Bookmarks**: Store and product bookmarking
- **Subscriptions**: Plan management, user subscriptions, analytics
- **Notifications**: Notification CRUD, read/unread management
- **AI**: `/ai/chat`, `/ai/recommendations`, `/ai/similar-products`
- **Files**: File upload and serving

### Configuration

- Environment variable support via dotenv
- Configurable port (default: 3000)
- Optional Swagger disabling via `DISABLE_SWAGGER` environment variable
- Database connection via `DATABASE_URL`
- AI API key via `GROQ_API_KEY`
- JWT secret configuration

### Testing

- Unit test support for all modules
- End-to-end test suite
- Test coverage reporting
- Jest configuration with TypeScript support
- Module path mapping for clean imports

---

## Version History

- **0.7.0** - Initial comprehensive release with full feature set

