# SeuToppers Frontend

React + Vite frontend for the supplied SeuToppers Spring Boot REST API.

## Stack

- React
- Vite
- Lucide React
- Custom responsive CSS
- REST API integration with JWT Bearer authentication

## Run

```bash
npm install
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:8080`

Copy `.env.example` to `.env` if the backend URL is different.

## Main UI

### Student

- Dashboard with top-ranked teachers
- Teacher search and profile view
- Rating/review performance visuals using backend data
- Help request creation and student-owned request management
- Open request browsing for teachers
- Private teacher interest list and teacher selection
- Class booking
- Service taken
- Payment history and bKash checkout hand-off
- Your submitted reviews shown read-only on the device where they were submitted
- Teacher application with CV upload
- 80% profile completion gate
- 3.80 CGPA frontend eligibility gate
- Profile picture upload with instant preview
- Student profile editing
- Forgot password and email OTP verification

### Teacher + Student

After admin approval, the same account keeps the student side and gets:

- Teaching profile
- Subjects/skills
- Qualification and experience
- Hourly rate
- Teaching mode and availability
- Service given
- Start/complete class controls
- Aggregate student rating/review count
- Teacher dashboard metrics

### Admin

- Separate admin dashboard
- Top-ranked teachers
- Pending teacher applications
- CV review links
- Approve/reject applications
- Payment history
- Manual bKash transaction hold confirmation
- Class history
- Teacher list
- Student search

## Backend limitations reflected in the UI

The supplied backend currently does not expose endpoints for:

- Google OAuth
- Persistent notification retrieval/creation
- Individual teacher review retrieval
- Full student list without using the existing name-search endpoint
- Ban/remove user actions

The frontend therefore does not fake those operations. Notification UI is provided for client-side activity events, and unavailable admin actions are visibly disabled until backend endpoints are added.

Submitted class reviews are sent to the backend, while the frontend caches review details in the current browser so students can see their own reviews and teachers can preview reviews left on that device. Cross-device student and teacher review lists require an individual-review retrieval endpoint from the backend.

The supplied backend also does not expose a public per-teacher completed-service count, so the public teacher profile uses the rating/review metrics that are actually available. The teacher's own service count is calculated from `/api/classes/teacher`.

## Profile upload flow

The profile page uploads the selected image to:

`POST /api/files/profile`

The returned path is then saved through:

`PUT /api/student/profile`

For teacher accounts, the same save also updates:

`PUT /api/teacher/profile`

## Security

The frontend stores the JWT locally and sends:

`Authorization: Bearer <token>`

Multipart file uploads intentionally do not set a manual `Content-Type`; the browser sets the multipart boundary.
