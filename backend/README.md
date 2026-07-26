# MediConsult Backend API

Production-ready REST API for the Online Doctor Consultation System built with **Node.js**, **Express**, and **MongoDB** using **MVC architecture**.

## Architecture

```
backend/
├── server.js                 # Entry point (HTTP + Socket.io)
├── src/
│   ├── config/               # Environment, DB, JWT, Stripe, Socket
│   ├── controllers/          # MVC Controllers (HTTP layer)
│   ├── middleware/           # Auth, validation, rate limiting, errors
│   ├── models/               # MVC Models (Mongoose schemas)
│   ├── routes/               # API route definitions
│   ├── services/             # Business logic layer
│   ├── utils/                # Helpers (ApiError, ApiResponse, asyncHandler)
│   ├── validators/           # Request validation rules
│   └── app.js                # Express application setup
```

## Features

- **Separate portals**: Patient and Doctor authentication with role-based access control
- **Appointment types**: Normal (scheduled) and Urgent (payment-gated)
- **Urgent flow**: Symptoms → Stripe checkout → auto-create appointment → doctor notification
- **Jitsi Meet**: Automatic meeting room creation with optional JWT authentication
- **Real-time notifications**: Socket.io for instant urgent case alerts to doctors
- **Stripe integration**: Secure payment gateway with webhook support
- **Production practices**: Helmet, CORS, rate limiting, compression, error handling

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Stripe account (for production payments)

## Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Stripe keys

npm install
npm run seed    # Optional: seed demo accounts
npm run dev     # Development with nodemon
npm start       # Production
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `CLIENT_URL` | Frontend URL for CORS and Stripe redirects |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `URGENT_CONSULTATION_FEE` | Fee in smallest currency unit (e.g. 4999 = ₹49.99) |
| `JITSI_DOMAIN` | Jitsi domain (default: meet.jit.si) |
| `JITSI_USE_JWT` | Enable JWT-secured Jitsi rooms |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/patient/register` | Register patient |
| POST | `/api/auth/patient/login` | Patient login |
| POST | `/api/auth/doctor/register` | Register doctor |
| POST | `/api/auth/doctor/login` | Doctor login |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/logout` | Logout |

### Appointments

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/appointments` | Both | List my appointments |
| POST | `/api/appointments/normal` | Patient | Book normal appointment |
| POST | `/api/appointments/urgent/initiate` | Patient | Start urgent flow (returns Stripe checkout URL) |
| GET | `/api/appointments/:id` | Both | Get appointment details |
| GET | `/api/appointments/:id/meeting` | Both | Get Jitsi meeting join URL |
| PATCH | `/api/appointments/:id/status` | Doctor | Update appointment status |
| POST | `/api/appointments/:id/cancel` | Both | Cancel appointment |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/webhook` | Stripe webhook (raw body) |
| POST | `/api/payments/verify` | Verify checkout session after redirect |
| POST | `/api/payments/:id/simulate-success` | Dev-only: simulate payment success |
| GET | `/api/payments/:id` | Get payment status |

### Doctors & Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | List available doctors (public) |
| GET | `/api/doctors/:id` | Get doctor profile |
| GET | `/api/doctors/portal/dashboard` | Doctor dashboard stats |
| GET | `/api/patients/dashboard` | Patient dashboard stats |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |

## Urgent Appointment Flow

```
1. Patient POST /api/appointments/urgent/initiate { symptoms }
2. Backend creates pending Payment + Stripe Checkout Session
3. Patient completes payment on Stripe
4. Stripe webhook OR POST /api/payments/verify triggers:
   - Assign available doctor
   - Create appointment with Jitsi meeting
   - Notify doctor via Socket.io + DB notification
5. Both parties GET /api/appointments/:id/meeting for join URL
```

## Socket.io Events

Connect with auth: `{ userId, role }` in `handshake.auth`.

| Event | Direction | Description |
|-------|-----------|-------------|
| `urgent:appointment` | Server → Doctor | New urgent case alert |
| `payment:success` | Server → Patient | Payment confirmed |
| `appointment:confirmed` | Server → Patient | Appointment confirmed |

## Demo Accounts (after seed)

- **Doctor**: `doctor1@mediconsult.com` / `Doctor@123`
- **Patient**: `patient1@mediconsult.com` / `Patient@123`

## Development Without Stripe

When `STRIPE_SECRET_KEY` is not set, urgent initiation returns `devMode: true`. Complete the flow with:

```bash
POST /api/payments/:paymentId/simulate-success
Authorization: Bearer <patient_token>
```

## License

MIT
