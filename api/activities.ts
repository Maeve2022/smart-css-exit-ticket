import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

function respond(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}
function teacherAuthorized(req: VercelRequest): boolean {
  const expected = process.env.TEACHER_ACCESS_KEY;
  const supplied = req.headers["x-teacher-key"];
  return Boolean(expected && typeof supplied === "string" && supplied === expected);
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return respond(res, 405, { error: "Method not allowed." });
  }
  if (req.method === "GET" && (!process.env.TEACHER_ACCESS_KEY || !teacherAuthorized(req))) {
    return respond(res, 401, { error: "Teacher access is required." });
  }
  if (!process.env.DATABASE_URL) return respond(res, 500, { error: "Server is missing DATABASE_URL." });
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      CREATE TABLE IF NOT EXISTS css_activity_submissions (
        id BIGSERIAL PRIMARY KEY,
        group_name TEXT NOT NULL,
        grade_level TEXT NOT NULL,
        section TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    if (req.method === "GET") {
      const rows = await sql`SELECT id, group_name AS "groupName", grade_level AS grade, section, payload, created_at AS "createdAt" FROM css_activity_submissions ORDER BY created_at DESC LIMIT 2000`;
      return respond(res, 200, { submissions: rows });
    }
    const body = req.body as { learner?: { group?: string; grade?: string; section?: string }; [key: string]: unknown };
    const learner = body?.learner;
    if (!learner || typeof learner.group !== "string" || !learner.group.trim() || learner.group.length > 120 ||
        typeof learner.grade !== "string" || !learner.grade.trim() ||
        typeof learner.section !== "string" || !learner.section.trim() ||
        !Array.isArray(body.checklist) || body.checklist.length !== 8 ||
        !body.checklist.every((item: any) => item && item.completed === true)) {
      return respond(res, 400, { error: "Provide group information and complete all eight checklist steps." });
    }
    const inserted = await sql`
      INSERT INTO css_activity_submissions (group_name, grade_level, section, payload)
      VALUES (${learner.group.trim()}, ${learner.grade.trim()}, ${learner.section.trim()}, ${JSON.stringify(body)}::jsonb)
      RETURNING id, group_name AS "groupName", grade_level AS grade, section, created_at AS "createdAt"
    `;
    return respond(res, 201, { submission: inserted[0], message: "Activity report submitted." });
  } catch (error) {
    console.error("CSS activity API error:", error);
    return respond(res, 500, { error: "Could not save the activity. Check the database configuration." });
  }
}
