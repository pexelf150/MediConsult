# MediConsult Frontend

Modern React frontend for the Online Doctor Consultation System with separate **Patient** and **Doctor** portals.

## Tech Stack

- React 18 + Vite
- React Router v7
- Tailwind CSS
- Axios
- Socket.io Client
- Jitsi React SDK

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Ensure the backend is running on `http://localhost:5000` and MongoDB is available.

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Socket.io server URL |

## Portals

### Patient (`/patient/*`)
- Dashboard with stats and upcoming appointments
- Book **Normal** appointments (symptoms, doctor selection, scheduling)
- Book **Urgent** appointments (symptoms → Stripe payment → auto-assignment)
- View appointments and join **Jitsi** video consultations

### Doctor (`/doctor/*`)
- Dashboard with urgent case alerts (real-time via Socket.io)
- Manage appointments and update status
- Complete consultations with diagnosis and prescription
- Notifications center for urgent alerts

## Demo Accounts

After running `npm run seed` in the backend:

- Patient: `patient1@mediconsult.com` / `Patient@123`
- Doctor: `doctor1@mediconsult.com` / `Doctor@123`

## Urgent Flow (Dev Mode)

When Stripe is not configured, the urgent booking flow shows a **Simulate Payment** button that triggers the backend dev endpoint.

## Scripts

```bash
npm run dev      # Development server (port 5173)
npm run build    # Production build
npm run preview  # Preview production build
```
