import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

type Answers = { q1: string; q2: string; q3: string; q4: string; q5: string; literacy: string };
type Reflection = { g1?: string; g2?: string; g3?: string };
type Scores = { q1: number; q2: number; q3: number; q4: number; q5: number; literacy: number; total: number };
type AssessmentPayload = {
  name: string;
  grade: string;
  section: string;
  answers: Answers;
  reflection?: Reflection;
};

function respond(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
const hasAny = (s: string, terms: string[]) => terms.some(t => normalize(s).includes(t));
const countGroups = (s: string, groups: string[][]) => groups.filter(g => hasAny(s, g)).length;

function scoreAnswers(a: Answers): Scores {
  const q1 = countGroups(a.q1, [
    ["shut down", "power off", "turn off", "switch off", "unplug", "disconnect"],
    ["ppe", "wrist strap", "anti-static", "antistatic", "gloves", "goggles", "safety glasses"],
    ["dry work area", "clean work area", "correct tools", "proper tools", "no liquids", "avoid liquids", "no water", "organized work area"]
  ]);
  const q2 = Number(hasAny(a.q2, ["shut down", "power off", "turn off", "switch off"])) +
             Number(hasAny(a.q2, ["unplug", "disconnect", "remove the power cable"]));
  const toolCount = countGroups(a.q3, [
    ["soft brush", "brush"], ["air blower", "blower", "compressed air"],
    ["screwdriver"], ["anti-static wrist strap", "wrist strap"], ["gloves"],
    ["goggles", "safety glasses"], ["esd mat", "anti-static mat"]
  ]);
  const purpose = hasAny(a.q3, ["clean", "remove dust", "protect", "prevent", "ground", "open", "loosen", "safety"]);
  const q3 = toolCount >= 2 && purpose ? 2 : toolCount >= 1 ? 1 : 0;
  const q4 = Number(hasAny(a.q4, ["fan", "ram", "storage", "cable", "connection", "motherboard", "component"]));
  const q5 = Number(hasAny(a.q5, ["update", "antivirus", "anti-virus", "backup", "back up", "security scan", "remove unwanted programs"]));
  const sentenceCount = a.literacy.trim().split(/[.!?]+/).filter(x => x.trim().length > 0).length;
  const literacy = Number(sentenceCount >= 2 && sentenceCount <= 3 &&
    hasAny(a.literacy, ["hazard"]) && hasAny(a.literacy, ["safety precaution"]) && hasAny(a.literacy, ["maintenance"]));
  return { q1, q2, q3, q4, q5, literacy, total: q1 + q2 + q3 + q4 + q5 + literacy };
}

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function teacherAuthorized(req: VercelRequest): boolean {
  const expectedKey = process.env.TEACHER_ACCESS_KEY;
  const suppliedKey = req.headers["x-teacher-key"];
  return Boolean(expectedKey && typeof suppliedKey === "string" && suppliedKey === expectedKey);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return res.status(204).end();
  }

  // Learners may submit answers publicly. Only teachers may read or delete records.
  if (req.method === "GET" || req.method === "DELETE") {
    if (!process.env.TEACHER_ACCESS_KEY) {
      return respond(res, 500, { error: "Server is missing TEACHER_ACCESS_KEY." });
    }
    if (!teacherAuthorized(req)) {
      return respond(res, 401, { error: "Unauthorized. Teacher access is required." });
    }
  } else if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE, OPTIONS");
    return respond(res, 405, { error: "Method not allowed." });
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
      const answerKeys: (keyof Answers)[] = ["q1", "q2", "q3", "q4", "q5", "literacy"];
      if (!body || !validText(body.name, 150) || !validText(body.grade, 30) ||
          !validText(body.section, 100) || !body.answers ||
          !answerKeys.every(key => validText(body.answers[key], 5000))) {
        return respond(res, 400, { error: "Please provide learner name, grade, section, and all six written responses." });
      }
      const reflection = body.reflection && typeof body.reflection === "object" ? {
        g1: typeof body.reflection.g1 === "string" ? body.reflection.g1.slice(0, 3000) : "",
        g2: typeof body.reflection.g2 === "string" ? body.reflection.g2.slice(0, 3000) : "",
        g3: typeof body.reflection.g3 === "string" ? body.reflection.g3.slice(0, 3000) : ""
      } : {};
      // Calculate the official keyword-based score on the server; never trust a score sent by the browser.
      const scores = scoreAnswers(body.answers);
      const inserted = await sql`
        INSERT INTO css_exit_tickets
          (learner_name, grade_level, section, answers, reflection, scores, total_score)
        VALUES
          (${body.name.trim()}, ${body.grade.trim()}, ${body.section.trim()},
           ${JSON.stringify(body.answers)}::jsonb,
           ${JSON.stringify(reflection)}::jsonb,
           ${JSON.stringify(scores)}::jsonb,
           ${scores.total})
        RETURNING id, learner_name AS name, grade_level AS grade, section,
                  answers, reflection, scores, total_score AS "totalScore",
                  created_at AS "createdAt"
      `;
      return respond(res, 201, { record: inserted[0], message: "Submission received." });
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
