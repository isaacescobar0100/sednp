# SIG-SERDNP — Sistema Integral de Gestión

Proyecto React + TypeScript + Tailwind. Diseño: navy institucional + dorado + cordillera andina.

## Cómo abrirlo en VS Code

1. Descomprime el archivo `sig-serdnp.zip`
2. Abre la carpeta `sig-serdnp` en VS Code (File → Open Folder)
3. Abre una terminal en VS Code (Terminal → New Terminal) y ejecuta:

```bash
npm install
npm run dev
```

4. Abre en el navegador la URL que muestre la terminal (normalmente `http://localhost:5173`)

## Estructura

- `src/App.tsx` — enrutamiento entre login y los 9 módulos
- `src/components/` — Sidebar, Header, tarjetas, badges, panel de login
- `src/pages/` — una página por módulo (Dashboard, Afiliación, Financiero, Gobernanza, Disciplinario, Comités, Comunicaciones, Documental, Reportes)
- `src/data/mockData.ts` — datos de ejemplo (reemplázalos por llamadas a tu API/backend real)

## Siguiente paso

Este código es el frontend con datos de ejemplo. Para producción falta conectar un backend real (Node/Flask + MySQL) que reemplace `mockData.ts` por datos reales vía API.
