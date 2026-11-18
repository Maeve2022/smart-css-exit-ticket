import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

type AssessmentPayload = {
  name: string;
  grade: string;
  section: string;
  answers: { q1: string; q2: string; q3: string; q4: string; q5: string; literacy: string };
  reflection?: { g1?: string; g2?: string; g3?: string };
  scores: { q1: number; q2: number; q3: number; q4: number; q5: number; literacy: number; total: number };
};

function respond(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return res.status(204).end();
  }

  const expectedKey = process.env.TEACHER_ACCESS_KEY;
  const suppliedKey = req.headers["x-teacher-key"];
  if (!expectedKey) return respond(res, 500, { error: "Server is missing TEACHER_ACCESS_KEY." });
  if (typeof suppliedKey !== "string" || suppliedKey !== expectedKey) {
    return respond(res, 401, { error: "Unauthorized. Check the teacher access key." });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return respond(res, 500, { error: "Server is missing DATABASE_URL." });

  try {
    const sql = neon(databaseUrl);
    await sql`
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
      )
    `;

    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, learner_name AS name, grade_level AS grade, section,
               answers, reflection, scores, total_score AS "totalScore",
               created_at AS "createdAt"
        FROM css_exit_tickets
        ORDER BY created_at DESC
        LIMIT 3000
      `;
      return respond(res, 200, { records: rows });
    }

    if (req.method === "POST") {
      const body = req.body as AssessmentPayload;
      if (!body || typeof body.name !== "string" || !body.name.trim() ||
          typeof body.grade !== "string" || !body.grade.trim() ||
          typeof body.section !== "string" || !body.section.trim() ||
          !body.answers || !body.scores) {
        return respond(res, 400, { error: "Please provide learner name, grade, section, answers, and scores." });
      }
      const total = Number(body.scores.total);
      if (!Number.isInteger(total) || total < 0 || total > 10) {
        return respond(res, 400, { error: "Score must be an integer from 0 to 10." });
      }
      const inserted = await sql`
        INSERT INTO css_exit_tickets
          (learner_name, grade_level, section, answers, reflection, scores, total_score)
        VALUES
          (${body.name.trim()}, ${body.grade.trim()}, ${body.section.trim()},
           ${JSON.stringify(body.answers)}::jsonb,
           ${JSON.stringify(body.reflection || {})}::jsonb,
           ${JSON.stringify(body.scores)}::jsonb,
           ${total})
        RETURNING id, learner_name AS name, grade_level AS grade, section,
                  answers, reflection, scores, total_score AS "totalScore",
                  created_at AS "createdAt"
      `;
      return respond(res, 201, { record: inserted[0] });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id) || id <= 0) return respond(res, 400, { error: "A valid record id is required." });
      const deleted = await sql`DELETE FROM css_exit_tickets WHERE id = ${id} RETURNING id`;
      if (!deleted.length) return respond(res, 404, { error: "Record not found." });
      return respond(res, 200, { deleted: true, id });
    }

    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return respond(res, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Exit ticket API error:", error);
    return respond(res, 500, { error: "Database operation failed. Check the Vercel function logs." });
  }
}
