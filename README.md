# SIG-SERDNP — Sistema Integral de Gestión

Prototipo funcional (beta simulador) del sistema de gestión de la **Organización
Sindical de Servidores Públicos del Departamento Nacional de Planeación — SERDNP**.

React + TypeScript + Vite + Tailwind. **Sin backend**: todo funciona con datos en
memoria que persisten en el navegador (`localStorage`), pensado para presentar el
flujo real de punta a punta. Diseño: navy institucional + dorado + cordillera andina.

> Las reglas de negocio están alineadas con los **Estatutos de SERDNP**, el
> **formulario oficial de afiliación** y el **documento conceptual del módulo
> financiero**.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abre la URL que muestre la terminal (normalmente `http://localhost:5173`).
Para compilar: `npm run build`.

## Cómo entrar

El login es **simulado** (sin autenticación real). Tiene dos modos:

- **Directiva** — eliges el rol de la Junta Directiva Nacional con el que operas:
  Presidencia, Vicepresidencia, Secretaría General, Tesorería o Fiscal.
- **Afiliado** — entra con **correo + contraseña** (los que la Secretaría le asignó
  al registrarlo); solo funciona si su afiliación está **aprobada**.

Se puede cambiar de rol en caliente desde el conmutador del encabezado. El botón
**"Reiniciar demo"** deja todo en el estado inicial.

## Módulos

| Módulo | Qué hace | Rol operador |
|---|---|---|
| **Dashboard** | KPIs y actividad en vivo (según el rol) | Todos |
| **Afiliación** | Registrar → concepto del Fiscal → aprobación de la Junta con acta | Secretaría / Fiscal / Presidencia |
| **Financiero** | Ingresos/egresos, aprobación por SMMLV, triple firma, orden de pago, presupuesto por rubro, aportes 0,3% + cuota extraordinaria | Tesorería / Presidencia / Fiscal |
| **Disciplinario** | Expedientes por etapas con términos, fallo, multa→Financiero y recursos (reposición/apelación) | Fiscal / Presidencia |
| **Gobernanza** | Sesiones, actas (Resolución/Acuerdo), quórum de Asamblea, votación secreta, Junta Directiva | Secretaría / Presidencia |
| **Documental** | Repositorio de documentos (cargar/descargar) | Secretaría |
| **Comunicaciones** | Comunicados a los afiliados | Secretaría |
| **Comités** | Comités temáticos (Art. 27) y órganos estatutarios de quejas/reclamos | Secretaría |
| **Reportes** | Consolidado en vivo + export CSV | Todos (lectura) |
| **Parámetros** | Catálogos (cargos, dependencias, tipos de vinculación), cuota % y SMMLV | Secretaría / Presidencia |
| **Portal del afiliado** | Perfil, aportes, votaciones y documentos | Afiliado |

**Separación de funciones** (según estatutos): quien **registra** no es quien
**aprueba**. Cada rol ve solo los módulos que le competen; donde no puede actuar,
aparece un candado 🔒.

## Cumplimiento estatutario

El borrador implementa, en el frontend, los flujos reglamentarios completos:

- **Afiliación (Art. 5, 25g):** Secretaría registra → Fiscal emite concepto → la
  Junta aprueba con número de acta.
- **Aportes (Art. 32, 33, 47g, 49g):** cuota ordinaria 0,3%; cuota extraordinaria
  decretada por la Asamblea (tope 3%, con acta); indicador de mora (30 días →
  amonestación, 60 → exclusión); nota de distribución 80/20.
- **Financiero (Art. 11f, 26, 34, 35):** niveles de gasto por SMMLV, triple firma,
  caja menor, orden de pago consecutiva y presupuesto por rubro con ejecución.
- **Gobernanza (Art. 10, 12b, 13, 59):** quórum de Asamblea (mitad + uno), votación
  secreta, actos según órgano (Resolución/Acuerdo) y Junta Directiva con suplentes.
- **Disciplinario (Art. 45, 51–57):** términos por etapa, multa que ingresa a
  Financiero, recursos de reposición/apelación y prescripción a 5 años.
- **Comités (Art. 27, 43):** cinco comités temáticos + Comité de Quejas y Reclamos
  y Comisión Estatutaria de Reclamos.

> Las **tablas/esquemas de base de datos** que sugieren los documentos se omiten a
> propósito: el simulador usa su propia arquitectura en memoria.

## Estructura del código

- `src/App.tsx` — enrutamiento (login → app directiva o portal del afiliado).
- `src/store/DemoStore.tsx` — estado global (React Context + reducer) con
  persistencia en `localStorage`. Es la "base de datos" del simulador.
- `src/store/*.ts` — modelo y reglas por dominio: `affiliates`, `finance`,
  `contributions` (aportes), `discipline`, `governance`, `documents`, `comms`,
  `committees`, `catalogs`, `session` (roles y permisos).
- `src/pages/` — una página por módulo.
- `src/components/` — Sidebar, Header (búsqueda global, notificaciones, conmutador
  de rol), tarjetas, badges, menú de fila, panel de login.

## Estado del proyecto

Prototipo/simulador **funcional y completo** para presentación. Lo que falta para
producción es **backend**: autenticación real, base de datos compartida,
validaciones de servidor, integración con la nómina del DNP y con el software
contable (SIIGO), firma digital, envío real de correos y almacenamiento de archivos.

> ⚠️ Sin backend, las contraseñas de afiliado se guardan en texto plano en el
> navegador solo para **simular** el acceso. No usar con datos reales.

Ver **[GUIA-PRUEBAS.md](GUIA-PRUEBAS.md)** para el guion de pruebas por rol.
