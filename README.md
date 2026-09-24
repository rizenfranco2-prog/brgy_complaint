# Barangay Complaint System

Full-stack Barangay Complaint System using:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MongoDB Atlas
- Authentication: JWT + bcryptjs
- Frontend hosting: Vercel
- Backend hosting: Render (recommended for the Express API)

## Features

### Users
- Register and login
- Facebook-style complaint/feed page
- Create posts
- Delete only their own posts
- Comment on posts
- Delete only their own comments
- Search posts
- Change password
- Logout

### Admin
- Login only; no public admin registration
- Dashboard
- Search posts
- Create announcements/posts
- Edit any post
- Delete any post
- Delete comments
- Change password
- Logout

## 1. Backend local setup

```powershell
cd backend
npm install
copy .env.example .env
npm run seed-admin
npm start
```

The API runs on `http://localhost:5000`.

Edit `.env` first:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_URL=http://localhost:5500
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ChangeThisPassword123!
```

`npm run seed-admin` creates the admin account from the two ADMIN_* variables. It does not create an admin registration page.

## 2. Frontend local setup

The frontend is plain HTML/CSS/JS. Open it with VS Code Live Server or another local web server.

Edit `frontend/config.js`:

```js
const API_URL = "http://localhost:5000";
```

For Vercel, change it to your deployed backend URL, for example:

```js
const API_URL = "https://your-backend.onrender.com";
```

## 3. MongoDB Atlas

Create a MongoDB Atlas cluster and database user. Put the Atlas connection string into `MONGODB_URI`.

For Render, make sure your Atlas Network Access allows the Render service to connect. Atlas commonly uses `0.0.0.0/0` for hosted services when no fixed outbound IP is available; use your organization's security requirements when deciding network access.

## 4. Deploy backend to Render

Create a Web Service from the repository.

Recommended settings:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

After deployment, run the seed command once from your local machine using the same production `MONGODB_URI` and admin credentials:

```powershell
cd backend
npm run seed-admin
```

## 5. Deploy frontend to Vercel

Import the repository into Vercel.

Recommended:
- Root Directory: `frontend`
- Framework Preset: Other
- Build Command: leave empty
- Output Directory: leave empty

Before deploying, update `frontend/config.js` with your backend URL.

## Security notes

- Never put `MONGODB_URI`, `JWT_SECRET`, or admin passwords in frontend files.
- Do not commit `.env`.
- Passwords are hashed with bcrypt.
- Authorization is checked by the backend.
- Users cannot delete or edit other users' posts through the API.
- Admin-only routes require an admin JWT.
