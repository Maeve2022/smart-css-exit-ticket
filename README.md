# Smart CSS Exit Ticket — Vercel + Neon

A React/Vite teacher dashboard with keyword-based auto-scoring, persistent PostgreSQL records (Neon), grade/section filters, Excel export, and printable individual reports.

## Requirements

- Node.js 20 or newer
- A Vercel account
- A Neon PostgreSQL database

## 1. Create the database

1. Create a project at https://neon.tech/
2. Open the Neon SQL Editor.
3. Run the following SQL (the API also creates this table automatically on first request):

```sql
CREATE TABLE IF NOT EXISTS css_exit_tickets (
  id BIGSERIAL PRIMARY KEY,
  learner_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  section TEXT NOT NULL,
  answers JSONB NOT NULL,
  reflection JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

4. Copy the Neon connection string. Keep it private.

## 2. Run locally

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL=your_neon_connection_string
TEACHER_ACCESS_KEY=use-a-long-unique-secret
```

Run the development server:

```bash
npm run dev
```

Important: Vite does not run Vercel API functions locally by itself. To test the `/api/records` endpoint locally, use the Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

Then open the local URL printed by Vercel. Sign in using the value of `TEACHER_ACCESS_KEY`.

## 3. Deploy to Vercel

### Option A — GitHub (recommended)

1. Create a GitHub repository and upload the contents of this folder.
2. In Vercel, select **Add New → Project** and import the repository.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. In **Project → Settings → Environment Variables**, add:

   - `DATABASE_URL` = your Neon connection string
   - `TEACHER_ACCESS_KEY` = a long, unique teacher-only secret

7. Add the variables to Production (and Preview only if you intend to use preview deployments).
8. Click **Deploy**. Redeploy after changing environment variables.

### Option B — Vercel CLI

From this project folder:

```bash
npm install
npm install -g vercel
vercel
```

Follow the prompts to link the project. Add the two environment variables in the Vercel project settings, then deploy:

```bash
vercel --prod
```

## 4. How to use

- Open the deployed site.
- Enter the teacher access key.
- Enter the learner's name, grade, section, and exit-ticket responses.
- The score preview updates as the learner's responses are typed.
- Save the record to PostgreSQL.
- Filter records by grade and section.
- Export the filtered class records to Excel.
- Use **Print** beside a learner to print an individual report.

## Scoring logic (10 points)

- Q1: 3 points — power isolation; PPE/ESD; safe work area/tools/liquid precautions.
- Q2: 2 points — shutdown and unplugging.
- Q3: 2 points — recognized tools/PPE and stated purpose.
- Q4: 1 point — component inspection.
- Q5: 1 point — software maintenance task.
- Literacy: 1 point — 2–3 sentences containing “hazard,” “safety precaution,” and “maintenance.”

This is keyword-based scoring, not semantic AI grading. It can miss correct answers written with unexpected vocabulary. A teacher must review responses and adjust official marks when appropriate.

## Security and learner-data notes

- Do not put `DATABASE_URL` or `TEACHER_ACCESS_KEY` in frontend code or commit `.env`.
- The API requires the teacher access key for every read/write/delete request.
- Use a long, unique access key and keep it private.
- Share the deployed URL only with authorized staff. Avoid using real learner data in public preview deployments.
- This starter has a single shared teacher key, not individual teacher accounts or role-based access.
- The browser stores the access key in session storage for the active tab/session.
- Set up appropriate school data-protection practices and backups before using this for official learner records.

## Project structure

```text
smart-css-exit-ticket/
├── api/
│   └── records.ts       # Vercel serverless API + Neon PostgreSQL
├── src/
│   ├── App.tsx          # Dashboard, assessment, records, export, print
│   ├── main.tsx
│   └── style.css
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig*.json
```
