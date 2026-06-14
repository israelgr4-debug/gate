# ANPR Gate — Israeli license-plate parking access

מערכת בקרת כניסה לחניה לפי זיהוי לוחית רישוי. כניסה בלבד.

> אפיון מלא: [`docs/anpr-gate-spec.md`](docs/anpr-gate-spec.md) · סכמה: [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql) · הנחיות בנייה: [`CLAUDE.md`](CLAUDE.md)

## מבנה הפרויקט

```
agent/          Local gate agent (Node.js + TypeScript)
lpr-service/    YOLO + OCR plate recognizer (Python + FastAPI)
  training/     Detector fine-tuning pipeline (capture → label → train → eval)
web/            Management dashboard (Next.js 14 + Tailwind, RTL Hebrew)
supabase/       SQL migrations
docs/           Spec
```

המערכת בשלוש שכבות:

1. **שכבת חומרה** — מצלמת IP + מודול ממסר Modbus TCP + בקר השער (LAN משותף).
2. **`agent/` + `lpr-service/`** על מיני‑PC באתר — הלב של המערכת, מקבל את ההחלטה ועובד גם offline.
3. **Supabase** (Postgres+Auth+Storage) ו‑דשבורד Next.js — ניהול ויומן (יבנה בהמשך).

## איך זה רץ — תרשים זרימה

```
RTSP frame ─► agent ─HTTP─► lpr-service ─► {plate, conf}
                  │
                  ├─► local cache lookup (SQLite)
                  ├─► decision engine (Asia/Jerusalem)
                  ├─► relay pulse (Modbus TCP) ── if granted
                  └─► event queue ─► Supabase Postgres + Storage
```

## הפעלה מקומית (פיתוח)

מצריך Docker + ffmpeg.

```powershell
# 1. הגדרת ENV
Copy-Item agent\.env.example agent\.env
Copy-Item lpr-service\.env.example lpr-service\.env
# ערוך את שני ה-.env: SUPABASE_URL/SERVICE_KEY, DEVICE_ID, RELAY_IP, CAMERA_RTSP_URL

# 2. בניית ה-monorepo והרצה
docker compose up --build

# הסוכן יכתוב frames ב-./agent/data/snapshots
# ה-LPR יקשיב על http://localhost:8000  (GET /health, POST /recognize)
```

ברירת המחדל של `lpr-service` היא `LPR_BACKEND=stub` — מחזיר לוחית קבועה, כדי שתוכלי לפתח end-to-end בלי GPU. כשהמודל מאומן, מציבים את המשקלות תחת `lpr-service/models/plate_detector.pt` ומעבירים ל‑`LPR_BACKEND=yolo`.

## הסכמה ב‑Supabase

```powershell
# מתוך Supabase SQL editor — הריצי את הקובץ:
supabase/migrations/0001_initial.sql
# ולאחר מכן ה-Storage: ליצור bucket פרטי בשם plate-snapshots
```

ראי שדות RLS בתוך הקובץ — הסוכן ניגש עם service role.

## אימון מודל הזיהוי

ראי [`lpr-service/training/README.md`](lpr-service/training/README.md) לתהליך מלא:
capture frames → bootstrap labels → manual review → split → train → eval.

## מפת דרכים נוכחית

- [x] Phase 0 — תשתית, monorepo, סכמה
- [x] Phase 1 — שלד הסוכן + ממסר (לא נבדק על חומרה)
- [x] Phase 2 — זיהוי + הכרעה + מטמון (LPR stub פעיל; YOLO מוכן למודל)
- [x] Phase 3 — יומן + תור offline
- [ ] Phase 4 — דשבורד Next.js (אימות + CRUD רכבים)
- [ ] Phase 5 — עורך כללי הרשאה + יומן חי + פתיחה ידנית
- [ ] Phase 6 — Compose מלא + retention cron + ניטור

## ולידציה מהירה (לפני שהריליי מחובר)

```powershell
# בודק קומפילציה
cd agent
npm install
npm run typecheck
```
