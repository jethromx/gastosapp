# Briq Satélite

Captura gastos, retiros e ingresos desde el teléfono cuando no estás en casa. **No es una
segunda Finanzas Pro**: es un buzón. La fuente de verdad sigue siendo briq-invest, en casa.

```
Teléfono (PWA)  ──POST──►  Netlify Function  ──append──►  Hoja «Satélite»  ◄──lee/marca──  briq-invest
   cola offline  ◄──GET───  (token)           ◄──lee────   Capturas / Catálogo  ──publica──►
```

- El satélite **solo agrega** filas a `Capturas`. No edita ni borra: lo mal capturado se corrige
  en casa. Así nunca hay que decidir quién gana ante un conflicto.
- briq-invest **publica** sus cuentas y categorías en `Catálogo`; el satélite no las inventa.
- Las reglas son las de `Movement` (`src/reglas.ts`): un retiro del cajero es un **traslado**
  débito → efectivo, no un gasto; un traslado no lleva categoría; el monto siempre es positivo.
  Se comprueban en el teléfono y otra vez en la función.
- Cada captura lleva un UUID del teléfono: si se reintenta, la función contesta "ya estaba".

Expo 57 + Expo Router + NativeWind, exportado como web estática; dos funciones en
`netlify/functions/`. Google Sheets con cuenta de servicio y Web Crypto, sin la librería de
Google, igual que el respaldo de briq-invest.

## Puesta en marcha

### 1. La hoja (Google Sheets)

1. Crea una hoja **nueva y solo para esto**. No uses el libro del respaldo de briq-invest:
   comparte pestañas con Finora 2 y esta credencial no debe alcanzarlo.
2. Dos pestañas, con estos encabezados en la fila 1:
   - `Capturas`: `id | capturada_en | fecha | tipo | monto | origen | destino | categoria | nota | importada_en`
   - `Catálogo`: `clase | id | nombre | tipo`
3. En Google Cloud, crea una cuenta de servicio **propia del satélite**, activa la Sheets API,
   genera una llave JSON y comparte la hoja con el correo de la cuenta como **Editor**.

Mientras briq-invest no publique el catálogo, se puede llenar a mano:

| clase | id | nombre | tipo |
|---|---|---|---|
| CUENTA | `<uuid de la cuenta en briq-invest>` | Nómina | DEBITO |
| CUENTA | … | Cartera | EFECTIVO |
| CATEGORIA | … | Comida | GASTO |
| PUBLICADO | | 2026-10-06T10:00:00Z | |

Los `id` tienen que ser los de briq-invest: son los que usará al importar.

### 2. GitHub

El código vive en <https://github.com/jethromx/gastosapp> (rama `main`).

### 3. Netlify

*Add new site → Import an existing project → GitHub →* `jethromx/gastosapp`. El build ya lo dice
`netlify.toml` (`npm run build`, publica `dist`, Node 24); solo hay que poner las variables en
*Site configuration → Environment variables*:

| Variable | Valor |
|---|---|
| `SATELITE_TOKEN` | `openssl rand -base64 32` (mínimo 32 caracteres; si es más corto, la función rechaza todo) |
| `GOOGLE_SA_EMAIL` | `client_email` del JSON de la cuenta de servicio |
| `GOOGLE_SA_KEY` | `private_key` del JSON, tal cual (con los `\n`) |
| `SHEET_ID` | lo que va entre `/d/` y `/edit` en la URL de la hoja |

Marca las cuatro como *secret* y con alcance *Functions*. Cada `git push` a `main` vuelve a
desplegar.

### 4. El teléfono

Abre la URL de Netlify, ve a **Ajustes**, pega el token y recarga el catálogo. Luego
*Compartir → Agregar a pantalla de inicio* (iOS) o *Instalar app* (Android) para que abra sin
señal.

## Desarrollo

```bash
npm install
npm test          # reglas y formato de la hoja (node --test, sin dependencias)
npm run typecheck
npm run web       # solo la interfaz; /api no existe aquí
npx netlify dev   # interfaz + funciones, con las variables en un .env (no se sube)
```

## El contrato con briq-invest

Lo que la app de casa tiene que hacer (todavía no existe allá):

1. **Importar:** leer `Capturas!A2:J`, tomar las filas con `importada_en` vacío, crear cada
   `Movement` con el `id` de la fila como llave idempotente y escribir el instante en la
   columna J. Si una no pasa las reglas de casa, dejarla sin marcar y avisar en pantalla.
2. **Publicar:** reescribir `Catálogo!A2:D` con las cuentas y categorías vigentes y una fila
   `PUBLICADO` con el instante.

`monto` es texto con dos decimales (`"1234.50"`) y `fecha` es `AAAA-MM-DD`: se escriben con
`RAW` para que una nota que empiece con `=` no se vuelva fórmula.
