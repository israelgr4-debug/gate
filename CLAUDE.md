# CLAUDE.md — מערכת בקרת כניסה לחניה (ANPR)

הנחיות בנייה ל‑Claude Code. קרא קודם את `anpr-gate-spec.md` ואת `anpr-gate-schema.sql`.

## מצב הפרויקט
כניסה בלבד (נתיב זיהוי יחיד). שלוש שכבות: סוכן מקומי באתר, Supabase לניהול, דשבורד Next.js.
עיקרון: **הסוכן המקומי מכריע בעצמו ועובד גם offline.** הענן לניהול/יומן בלבד.

## Stack
- **Agent**: Node.js 20 + TypeScript, `modbus-serial`, `better-sqlite3` (מטמון מקומי), `@supabase/supabase-js`. אריזה ב‑Docker.
- **LPR**: ממשק `IPlateRecognizer`. מימוש ראשון — Plate Recognizer Snapshot SDK (Docker, on‑prem, `regions=il`). מימוש חלופי — YOLOv8 + OCR נומרי.
- **DB/Backend**: Supabase (Postgres + Auth + Storage).
- **Web**: Next.js 14 (App Router) + TypeScript + Tailwind, עברית RTL (`dir="rtl"`, `lang="he"`). פריסה ל‑Vercel.

## מבנה ריפו (monorepo)
```
/agent        # שירות הסוכן המקומי (Node/TS, Docker)
/web          # דשבורד Next.js
/supabase     # migrations (הסכמה) + seed
/docs         # anpr-gate-spec.md
```

## מוסכמות
- כל הזמנים `Asia/Jerusalem`. נרמול לוחית = ספרות בלבד, אורך 7–8; שמור גם `plate_display`.
- TypeScript strict. אין סודות בקוד — רק משתני סביבה. service key רק בצד שרת/סוכן.
- כל פעולת DB דרך טבלאות/פונקציות הסכמה הקיימת; אל תשנה את הסכמה בלי לעדכן את `anpr-gate-schema.sql`.
- ה‑UI כולו עברית RTL, mobile‑first.

## סדר בנייה (Phases)

### Phase 0 — תשתית
- [ ] הרצת `anpr-gate-schema.sql` ב‑Supabase; יצירת bucket פרטי `plate-snapshots`.
- [ ] הקמת monorepo, lint, prettier, tsconfig strict.
- קבלה: המיגרציות עוברות; אפשר לקרוא טבלאות ריקות.

### Phase 1 — Agent: שלד + ממסר
- [ ] טעינת env (`RELAY_IP`, `RELAY_PORT`, `RELAY_UNIT_ID`, `RELAY_CHANNEL`, `DEVICE_ID`, `SUPABASE_*`, `TZ`).
- [ ] מודול `relay.ts`: `pulseGate()` — דופק בטוח (coil ON → 600ms → OFF) דרך `modbus-serial`.
- [ ] heartbeat: עדכון `gate_devices.last_seen` כל ~30ש'.
- קבלה: קריאה ל‑`pulseGate()` פותחת את השער בפועל; `last_seen` מתעדכן.

### Phase 2 — Agent: זיהוי + הכרעה + מטמון
- [ ] ממשק `IPlateRecognizer` + מימוש Plate Recognizer (frame → `PlateRead`).
- [ ] נרמול לוחית + סף ביטחון (`CONFIDENCE_THRESHOLD`) + debounce (`COOLDOWN_SECONDS`).
- [ ] מטמון SQLite מקומי לרכבים+כללים; סנכרון מ‑Supabase כל ~60ש'.
- [ ] מנוע הכרעה מקומי המשכפל את `is_vehicle_granted` (§7 באפיון).
- [ ] בהחלטה `granted` → `pulseGate()`.
- קבלה: רכב מורשה פותח; לא מורשה לא; offline (מנותק מ‑Supabase) עדיין מכריע נכון מהמטמון.

### Phase 3 — Agent: יומן + תור offline
- [ ] רישום כל אירוע (granted/denied/unrecognized) מקומית עם צילום.
- [ ] תור העלאה ל‑Supabase (אירוע + צילום ל‑Storage) עם retry; השלמה אחרי חזרת חיבור.
- קבלה: ניתוק אינטרנט → אירועים נצברים ומועלים בשלמותם כשהחיבור חוזר.

### Phase 4 — Web: אימות + ניהול רכבים
- [ ] Supabase Auth + טבלת `profiles`; תפקידים admin/viewer.
- [ ] CRUD רכבים (עברית RTL): לוחית, תצוגה, בעלים, סוג, פעיל.
- קבלה: admin מנהל רכבים; viewer קריאה בלבד; RLS אוכף.

### Phase 5 — Web: כללי הרשאה + יומן
- [ ] עורך כללים לכל רכב: always / weekly (ימים+שעות) / date_range / one_time.
- [ ] יומן מעברים חי עם צילום, חיפוש וסינון לפי החלטה/תאריך/לוחית.
- [ ] כפתור פתיחה ידנית (כותב ל‑`manual_actions`; הסוכן מאזין ומפעיל `pulseGate`).
- [ ] מסך מצב מכשיר (online/offline לפי `last_seen`).
- קבלה: כל סוגי הכללים נאכפים נכון; פתיחה ידנית עובדת ונרשמת.

### Phase 6 — תפעול
- [ ] Docker Compose לסוכן (+ LPR), restart=always.
- [ ] retention: `purge_old_events` כ‑cron (ברירת מחדל 60 יום).
- [ ] התראות מכשיר‑offline / לוחית לא מוכרת (אופציונלי).
- קבלה: ריצת בדיקות הקבלה §14 באפיון עוברת מקצה לקצה.

## אל תעשה
- אל תכניס סודות/מפתחות לקוד או לצד‑לקוח.
- אל תוציא צילומי לוחיות מה‑bucket הפרטי ואל תחשוף נתוני לוחיות בלי אימות.
- אל תקבל את החלטת הפתיחה בענן בלבד — ההכרעה תמיד גם מקומית (עמידות offline).
- אל תסמוך על המערכת לבטיחות סגירת השער — זו אחריות ה‑loop/photocell של הבקר.
