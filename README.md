# Smart CSS Exit Ticket — Student Portal + Teacher Dashboard

React/Vite application for the Computer Maintenance with Safety exit ticket.

## Public and protected pages

- Student portal: `/` or `/student`
- Teacher dashboard: `/teacher` (requires `TEACHER_ACCESS_KEY`)

Learners can submit their responses without a teacher access key. Only authenticated teachers can list or delete stored learner records. The API calculates the keyword-based score on the server; it does not trust a score sent by the browser.

## Required Vercel environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for the Production environment:

- `DATABASE_URL` — Neon PostgreSQL connection string
- `TEACHER_ACCESS_KEY` — long, unique teacher-only secret

Redeploy after adding or changing environment variables.

## Database

The API creates the `css_exit_tickets` table automatically on its first request. The table stores learner name, grade, section, written answers, optional generalization reflections, scores, and submission time.

## Deploy

1. Extract this ZIP file. Upload the extracted project contents (not the ZIP file itself) to the Git repository connected to Vercel, or import the project. Make sure the updated `src/App.tsx`, `vercel.json`, and `api/records.ts` are included.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add the two environment variables above.
6. Deploy or redeploy.

## Use

- Share `https://YOUR-PROJECT.vercel.app/student` with learners. This opens the learner form and does not ask for the teacher access key. The root URL `/` also opens the learner form.
- Use `https://YOUR-PROJECT.vercel.app/teacher` for the teacher dashboard. Do not share this teacher URL with learners.
- The teacher dashboard requires the `TEACHER_ACCESS_KEY`.
- Learner submissions are public; record viewing and deletion remain protected.

## Assessment scoring

The 10-point scoring is keyword-based:
- Q1 safety precautions: 3
- Q2 shutdown/unplug: 2
- Q3 tools/PPE: 2
- Q4 component inspection: 1
- Q5 software maintenance: 1
- Literacy check: 1

This is not semantic AI grading. Review learner responses before finalizing official marks. A correct answer using an unrecognized phrase may receive fewer automated points.

## Security and learner-data considerations

- Never put `DATABASE_URL` or `TEACHER_ACCESS_KEY` in frontend code or commit `.env`.
- Public learners can submit data but cannot read or delete records through the API.
- Because the student form is public, share it only with your class and review submissions for spam or duplicate entries.
- Follow school data privacy and retention practices. Back up the database appropriately.


## Computer Maintenance with Safety activities

The repository also includes an interactive activity portal aligned to the supplied classroom activity slides:

- Student activity portal: `/activities`
- Teacher group-report viewer: `/activity-reports` (requires `TEACHER_ACCESS_KEY`)
- Main teacher dashboard: `/teacher`
- Learner exit ticket: `/student`

The activities portal includes the 8-step sequencing task, picture-cue checklist, paired Technician/Recorder performance task, inspection record, Computer Maintenance Report fields, literacy and numeracy tasks, extension, reflection, and 10-item formative quiz. Group submissions are stored in the `css_activity_submissions` PostgreSQL table. The teacher report viewer retrieves the submitted group records through the protected API.

**Google Docs template:** [Open the Computer Maintenance Report template](https://docs.google.com/document/d/1DW_jDML8HQ7AT-oD7OVjFZah5eC7ROKmIwLVQ0NxyaY/edit?usp=sharing). The app currently links learners to this existing Google Doc and saves their submitted reports in the app database. It does not yet create or write a separate Google Doc for each group; that requires an authenticated Google Docs/Drive integration or an Apps Script endpoint.
