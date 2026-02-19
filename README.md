# RehersalPlaner

A web application for musicians to vote on rehearsal dates.

## Features

- **Admin Management**: Create, edit, and delete rehearsals with multiple date options
- **User Voting**: Musicians can vote on preferred rehearsal dates and add comments
- **Date Selection**: Admins can select a winning date
- **User Management**: Admins can create and manage user accounts
- **Profile**: Users can update their username and password

## Tech Stack

- **Frontend**: Vanilla TypeScript, HTML, CSS
- **Backend**: Node.js with Express
- **Storage**: JSON file-based

## Getting Started

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

The app will be available at http://localhost:3001

### Build TypeScript
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

## First Setup

1. Open the app in your browser
2. Create your admin account (first-time setup)
3. Login with your admin credentials
4. Use "Manage Users" to create additional users

## Password Requirements

- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

## API Endpoints

- `GET /api/auth/status` - Check if setup is complete
- `POST /api/auth/setup` - Create first admin account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/rehearsals` - List all rehearsals
- `POST /api/rehearsals` - Create rehearsal (admin)
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user (admin)
- `PUT /api/profile` - Update own profile

## License

MIT
