# RehersalPlaner - Specification

## Project Overview
- **Project name**: RehersalPlaner
- **Type**: Full-stack web application
- **Core functionality**: Allow admin to create rehearsals with multiple date options, musicians can vote on preferred dates and add comments
- **Target users**: Band/music group admins and members

## Tech Stack
- **Frontend**: HTML, CSS, TypeScript (vanilla)
- **Backend**: Node.js with Express
- **Storage**: JSON file-based (simple, no database required)

---

## Data Models

### Rehearsal
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "createdAt": "ISO date",
  "dates": [DateOption],
  "selectedDateId": "uuid | null"
}
```

### DateOption
```json
{
  "id": "uuid",
  "datetime": "ISO datetime",
  "location": "string",
  "votes": [
    {
      "userName": "string",
      "comment": "string",
      "createdAt": "ISO date"
    }
  ]
}
```

---

## UI/UX Specification

### Color Palette
- **Background**: #0d0d0d (near black)
- **Surface**: #1a1a1a (dark gray)
- **Surface elevated**: #252525
- **Primary**: #ff6b35 (vibrant orange)
- **Primary hover**: #ff8c5a
- **Secondary**: #4ecdc4 (teal)
- **Text primary**: #f5f5f5
- **Text secondary**: #a0a0a0
- **Border**: #333333
- **Success**: #2ecc71
- **Danger**: #e74c3c

### Typography
- **Font family**: 'DM Sans', sans-serif
- **Headings**: 'Syne', sans-serif (bold, distinctive)
- **Monospace**: 'JetBrains Mono' (for dates/times)

### Layout
- Max-width: 900px centered
- Responsive: single column on mobile, comfortable spacing on desktop
- Cards with subtle borders and slight elevation

### Components

#### Navigation
- Simple top bar with app title and role toggle (Admin/User mode)

#### Admin View
- **Rehearsal List**: Card per rehearsal with title, description preview, date count
- **Create/Edit Form**: Modal or inline form for:
  - Title (text)
  - Description (textarea)
  - Multiple date/time options with location
  - Save/Cancel buttons

#### User View
- **Rehearsal Cards**: Show title, description, all date options
- **Voting**: Click to vote on a date, opens comment modal
- **Results**: Show vote count per date, highlight selected date

#### Date Card
- Date/time in large monospace font
- Location
- Vote count with progress bar
- User's vote status (if voted)
- Comment preview

### Animations
- Smooth fade-in for cards
- Scale on button hover
- Progress bar animation on load
- Modal fade/slide

---

## API Endpoints

### Rehearsals
- `GET /api/rehearsals` - List all rehearsals
- `GET /api/rehearsals/:id` - Get single rehearsal
- `POST /api/rehearsals` - Create rehearsal
- `PUT /api/rehearsals/:id` - Update rehearsal
- `DELETE /api/rehearsals/:id` - Delete rehearsal
- `POST /api/rehearsals/:id/select-date` - Select winning date

### Votes
- `POST /api/rehearsals/:id/dates/:dateId/vote` - Add vote with comment

---

## Functionality

### Admin Features
1. Create new rehearsal with title, description
2. Add multiple date/time/location options to rehearsal
3. Edit rehearsal details and date options
4. Delete rehearsals
5. Select one date as the confirmed rehearsal time
6. View all votes and comments per date

### User Features
1. View all available rehearsals
2. See all date options for each rehearsal
3. Vote for one date (one vote per rehearsal)
4. Add a comment when voting
5. Change vote (can re-vote)
6. See which date was selected by admin

---

## Acceptance Criteria
1. Admin can create a rehearsal with multiple date options
2. Admin can edit and delete rehearsals
3. Admin can select a winning date (highlighted for all)
4. Users can vote on one date per rehearsal
5. Users can add a comment with their vote
6. Vote counts are visible to all
7. Data persists between server restarts (JSON file)
8. Responsive design works on mobile
