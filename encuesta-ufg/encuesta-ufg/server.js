const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const PUERTO = process.env.PORT || 3000;
const CLAVE = process.env.CLAVE_ADMIN || "ufg2026";
const preguntas = require("./preguntas.json");

const rutaDb = process.env.DB_PATH || path.join(__dirname, "datos", "encuesta.db");
fs.mkdirSync(path.dirname(rutaDb), { recursive: true });
const db = new Database(rutaDb);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS respuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS detalle (
    respuesta_id INTEGER NOT NULL REFERENCES respuestas(id),
    pregunta INTEGER NOT NULL,
    opcion INTEGER NOT NULL,
    PRIMARY KEY (respuesta_id, pregunta)
  );
`);
const nuevaRespuesta = db.prepare("INSERT INTO respuestas DEFAULT VALUES");
const nuevoDetalle = db.prepare("INSERT INTO detalle (respuesta_id, pregunta, opcion) VALUES (?, ?, ?)");
const guardar = db.transaction((resp) => {
  const id = nuevaRespuesta.run().lastInsertRowid;
  resp.forEach((op, p) => nuevoDetalle.run(id, p, op));
});

const app = express();
app.use(express.json({ limit: "10kb" }));

// Límite simple: 30 envíos por minuto por conexión (la IP no se guarda en la base)
const intentos = new Map();
setInterval(() => intentos.clear(), 60000).unref();
function limitar(req, res, next) {
  const n = (intentos.get(req.ip) || 0) + 1;
  intentos.set(req.ip, n);
  return n > 30 ? res.status(429).json({ error: "Demasiados envíos" }) : next();
}

function soloAdmin(req, res, next) {
  const clave = req.get("x-clave") || req.query.clave;
  return clave === CLAVE ? next() : res.status(401).json({ error: "Clave incorrecta" });
}

app.get("/api/preguntas", (req, res) => res.json(preguntas));

app.post("/api/respuestas", limitar, (req, res) => {
  const r = req.body && req.body.respuestas;
  const valido = Array.isArray(r) && r.length === preguntas.length &&
    r.every((op, p) => Number.isInteger(op) && op >= 0 && op < preguntas[p].opciones.length);
  if (!valido) return res.status(400).json({ error: "Respuestas inválidas" });
  guardar(r);
  res.status(201).json({ ok: true });
});

app.get("/api/resultados", soloAdmin, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS n FROM respuestas").get().n;
  const filas = db.prepare("SELECT pregunta, opcion, COUNT(*) AS n FROM detalle GROUP BY pregunta, opcion").all();
  const salida = preguntas.map((p, i) => ({
    n: i + 1, seccion: p.seccion, texto: p.texto,
    opciones: p.opciones.map((t, k) => ({
      texto: t, cuenta: (filas.find(f => f.pregunta === i && f.opcion === k) || { n: 0 }).n
    }))
  }));
  res.json({ total, preguntas: salida });
});

app.get("/api/exportar.csv", soloAdmin, (req, res) => {
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const filas = db.prepare("SELECT respuesta_id, pregunta, opcion FROM detalle").all();
  const porId = new Map();
  filas.forEach(f => {
    if (!porId.has(f.respuesta_id)) porId.set(f.respuesta_id, []);
    porId.get(f.respuesta_id)[f.pregunta] = preguntas[f.pregunta].opciones[f.opcion];
  });
  const fechas = db.prepare("SELECT id, creado_en FROM respuestas ORDER BY id").all();
  const cab = ["N", "Fecha", ...preguntas.map((p, i) => `P${i + 1}: ${p.texto}`)].map(esc).join(",");
  const cuerpo = fechas.map(f => [f.id, f.creado_en, ...preguntas.map((_, i) => (porId.get(f.id) || [])[i] || "")].map(esc).join(","));
  res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=respuestas_encuesta_ufg.csv" });
  res.send("\ufeff" + [cab, ...cuerpo].join("\n"));
});

app.get("/resultados", (req, res) => res.sendFile(path.join(__dirname, "public", "resultados.html")));
app.use(express.static(path.join(__dirname, "public")));

app.listen(PUERTO, () => {
  console.log(`Encuesta:   http://localhost:${PUERTO}`);
  console.log(`Resultados: http://localhost:${PUERTO}/resultados`);
  if (!process.env.CLAVE_ADMIN) console.log("AVISO: usando la clave por defecto. Define CLAVE_ADMIN antes de publicar.");
});
