# Encuesta UFG: educación financiera y consumo sostenible

Programa con servidor, base de datos (SQLite) y panel de resultados con gráficos.

## Contenido de la carpeta

| Archivo | Para qué sirve |
|---|---|
| `server.js` | Servidor: recibe respuestas, las guarda y calcula resultados |
| `preguntas.json` | Las 20 preguntas y sus opciones. Se edita aquí |
| `public/index.html` | La encuesta que ven los estudiantes |
| `public/resultados.html` | Panel con gráficos (protegido con clave) |
| `public/chart.umd.js` | Librería de gráficos (funciona sin internet) |
| `datos/encuesta.db` | Base de datos; se crea sola al iniciar |
| `package.json` | Dependencias del proyecto |

## Cómo ejecutarlo

1. Instalar [Node.js](https://nodejs.org) versión 18 o superior.
2. Abrir una terminal dentro de esta carpeta y ejecutar:
   ```
   npm install
   npm start
   ```
3. Abrir en el navegador:
   - Encuesta: http://localhost:3000
   - Resultados: http://localhost:3000/resultados (clave por defecto: `ufg2026`)

## Cambiar la clave de resultados

Antes de compartir la encuesta, definan su propia clave:

- Windows (PowerShell): `$env:CLAVE_ADMIN="mi-clave-segura"; npm start`
- Mac o Linux: `CLAVE_ADMIN="mi-clave-segura" npm start`

## Que los estudiantes respondan desde sus celulares

- **Misma red wifi:** ejecuten el programa en una computadora y compartan `http://IP-de-esa-computadora:3000`. La computadora debe quedar encendida.
- **Internet:** súbanlo a un servicio como Render o Railway. Importante: activen un **disco persistente** y definan `DB_PATH` apuntando a ese disco; de lo contrario las respuestas se borran en cada reinicio. Definan también `CLAVE_ADMIN`.

## Respaldo y análisis

- El panel tiene el botón **Descargar CSV**, que se abre en Excel o Google Sheets.
- Para un respaldo completo, copien el archivo `datos/encuesta.db` cada cierto tiempo.
- La encuesta es anónima: no se guardan nombres, correos ni direcciones IP.

## Cambiar preguntas

Editen `preguntas.json` y reinicien el servidor. Cada pregunta debe tener 4 opciones (el panel tiene 4 colores). Si cambian preguntas después de recibir respuestas, los resultados anteriores quedarán mezclados: háganlo antes de empezar o borren `datos/encuesta.db`.
