import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";
const correct = [1,1,1,1,2,0,1,2,0,1];
function send(res:VercelResponse,status:number,body:unknown){return res.status(status).json(body)}
function authorized(req:VercelRequest){const expected=process.env.TEACHER_ACCESS_KEY;const supplied=req.headers["x-teacher-key"];return Boolean(expected&&typeof supplied==="string"&&supplied===expected)}
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader("Cache-Control","no-store");
 if(req.method==="OPTIONS"){res.setHeader("Allow","GET, POST, OPTIONS");return res.status(204).end()}
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST, OPTIONS");return send(res,405,{error:"Method not allowed."})}
 if(req.method==="GET"&&!authorized(req))return send(res,401,{error:"Teacher access is required."});
 if(!process.env.DATABASE_URL)return send(res,500,{error:"Server is missing DATABASE_URL."});
 try{
  const sql=neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS css_formative_assessments(id BIGSERIAL PRIMARY KEY,learner_name TEXT NOT NULL,grade_level TEXT NOT NULL,section TEXT NOT NULL,answers JSONB NOT NULL,score INTEGER NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  if(req.method==="GET"){
   const records=await sql`SELECT id,learner_name AS name,grade_level AS grade,section,answers,score,created_at AS "createdAt" FROM css_formative_assessments ORDER BY created_at DESC LIMIT 3000`;
   return send(res,200,{records});
  }
  const body=req.body as {name?:unknown;grade?:unknown;section?:unknown;answers?:unknown};
  if(typeof body?.name!=="string"||!body.name.trim()||body.name.length>150||typeof body.grade!=="string"||!body.grade.trim()||body.grade.length>30||typeof body.section!=="string"||!body.section.trim()||body.section.length>100||!Array.isArray(body.answers)||body.answers.length!==10||!body.answers.every((a:any)=>Number.isInteger(a)&&a>=0&&a<=3))
   return send(res,400,{error:"Provide learner name, grade, section, and one answer for all 10 questions."});
  const score=body.answers.reduce((sum:number,a:number,i:number)=>sum+(a===correct[i]?1:0),0);
  const inserted=await sql`INSERT INTO css_formative_assessments(learner_name,grade_level,section,answers,score) VALUES(${body.name.trim()},${body.grade.trim()},${body.section.trim()},${JSON.stringify(body.answers)}::jsonb,${score}) RETURNING id,learner_name AS name,grade_level AS grade,section,answers,score,created_at AS "createdAt"`;
  return send(res,201,{record:inserted[0]});
 }catch(error){console.error("Formative assessment API error:",error);return send(res,500,{error:"Could not save assessment. Check the database configuration."})}
}
