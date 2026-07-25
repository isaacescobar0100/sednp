# Guía de pruebas — SIG-SERDNP (beta simulador)

Guía para ejecutar una prueba de punta a punta del sistema, **rol por rol**.
Todo funciona con datos en memoria (sin backend): lo que registres se guarda en
el navegador y se refleja en vivo en el resto de módulos.

---

## 1. Preparación

1. Inicia la app (o abre la URL del demo).
   - En local: `npm install` y luego `npm run dev` → abre `http://localhost:5173`.
2. **Inicio de sesión (simulado):** cualquier correo y contraseña sirven. Antes de
   entrar, **elige el rol** con el que vas a probar.
3. **Cambiar de rol sin cerrar sesión:** usa el selector de la esquina superior
   derecha (ícono ⚙️ con el nombre del rol). Al cambiar, también cambia el usuario
   del menú lateral.
4. **Empezar de cero otra vez:** botón **"Reiniciar demo"** en la cabecera. Deja
   todos los módulos vacíos.

> El sistema arranca **vacío**: sin afiliados, sin movimientos, sin expedientes, etc.
> Los datos aparecen a medida que cada rol los registra.

---

## 2. Roles y qué puede hacer cada uno

| Rol | Módulos que ve | Puede hacer | NO puede |
|---|---|---|---|
| **Secretaría General** | Dashboard, Afiliación, Gobernanza, Comités, Comunicaciones, Documental, Reportes, Parámetros | Registrar afiliados; sesiones y actas; abrir votaciones y votar; cargar documentos; enviar comunicados; crear/gestionar comités; administrar catálogos (Parámetros) | Aprobar afiliaciones; cerrar votaciones; módulos Financiero y Disciplinario |
| **Tesorería** | Dashboard, Financiero, Reportes | Registrar ingresos y gastos; marcar gastos como pagados | Aprobar gastos |
| **Fiscal disciplinario** | Dashboard, Disciplinario, Reportes | Abrir expedientes; avanzar etapas | Dictar el fallo / archivar |
| **Presidencia** | Todos | Todo lo anterior + **aprobar afiliaciones** + aprobar gastos + dictar fallos + cerrar votaciones | — |

> **Regla de oro (separación de funciones):** quien **registra** no es quien **aprueba**.
> Donde un rol no puede actuar, verás un **candado 🔒** con la explicación.

---

## 3. Guía paso a paso por rol

### 3.1 Secretaría General
**Objetivo:** registrar afiliados y gestionar gobernanza, documental, comunicaciones, comités y parámetros.

**Afiliación (registrar)**
1. Entra como **Secretaría General**.
2. Módulo **Afiliación** → botón **"Nuevo afiliado"**.
3. Completa el asistente (Datos personales → Información laboral → Revisión) y
   **Confirmar inscripción**. El afiliado queda en estado **Pendiente**.

✅ **Verifica:** aparece como *Pendiente*; en cada fila ves un **🔒** (Secretaría
registra pero **no aprueba**); la aprobación la hace Presidencia (ver 3.4).

**Parámetros (catálogos)**
1. Módulo **Parámetros** → agrega un **cargo**, una **dependencia** o un **tipo de vinculación**.
2. Vuelve a **Afiliación → Nuevo afiliado → paso 2**: los nuevos valores aparecen en los desplegables.

**Gobernanza**
1. **Agendar sesión** (título, órgano, fecha, hora/lugar).
2. En la sesión → **Registrar acta** → queda como *Realizada* y se muestra como
   "Última acta publicada".
3. Sección **Votaciones** → **Abrir votación** → luego **Votar** (la barra se mueve al instante).
4. Intenta **Cerrar votación** → verás **🔒 "Cierre: Presidencia"** (no puede cerrarla).

**Documental**
1. **Cargar documento** (título, tipo, páginas) → aparece con código autogenerado.
2. Clic en el ícono de **descarga** → baja un archivo `.txt` real.

**Comunicaciones**
1. Elige **destinatarios** (Todos / Activos / Pendientes — muestra el número real del padrón).
2. Escribe asunto y mensaje → **Enviar**.

✅ **Verifica:** el comunicado aparece de primero en el historial con la cantidad
real de destinatarios.

**Documental** *(actualizado)*
1. **Cargar documento** (título, tipo) → **adjunta un archivo** real de tu equipo.
2. Clic en **descarga** → baja el archivo adjuntado (archivos ≤ 1 MB) o una ficha de referencia.

**Comités**
1. **Crear comité** (nombre) → elige **encargado** e **integrantes** desde el padrón de afiliados.
2. Usa **✏️ editar** / **🗑️ borrar** en cada tarjeta.

✅ **Verifica:** el banner "N afiliados aportan… (%)" se actualiza en vivo.

---

### 3.2 Tesorería
**Objetivo:** mover el libro contable.

1. Cambia el rol a **Tesorería**. Módulo **Financiero**.
2. **Registrar ingreso** (asunto, categoría, **fecha**, valor) → queda **Confirmado**.
   - 💡 Puedes poner **fechas de meses anteriores** para llenar el gráfico mensual.
3. **Registrar gasto** → queda **Por aprobar**.
4. Intenta gestionar el gasto → verás **🔒** (Tesorería no aprueba).

✅ **Verifica:** suben las tarjetas "Ingresos confirmados" y "Gastos por aprobar";
el "Flujo de caja" muestra los meses que registraste.

*(El paso de pagar un gasto va después de que Presidencia lo apruebe — ver 3.4.)*

---

### 3.3 Fiscal disciplinario
**Objetivo:** instruir expedientes.

1. Cambia el rol a **Fiscal disciplinario**. Módulo **Disciplinario**.
2. **Abrir expediente** (asunto, involucrado, término en días) → inicia en **Apertura, En trámite**.
3. En el detalle, **Avanzar** por las etapas: Apertura → Investigación → Pliego de cargos → **Decisión**.
4. Al llegar a *Decisión*, verás el aviso **🔒 "El fallo lo profiere Presidencia"**.

✅ **Verifica:** el término se pinta en **rojo** si quedan ≤5 días; en el Dashboard
sube "Procesos activos".

---

### 3.4 Presidencia
**Objetivo:** aprobar, decidir y supervisar (ve todos los módulos).

**Afiliación — aprobar**
1. Entra como **Presidencia**. Módulo **Afiliación**.
2. Filtra por **Pendiente** → menú **⋯** de un afiliado → **Aprobar afiliación**
   (también **Suspender / Reactivar / Retirar**).

✅ **Verifica:** el afiliado pasa a *Activo*; sube la tarjeta "Activos" y el Dashboard.

**Financiero — aprobar gasto**
3. Módulo **Financiero**. En un gasto **Por aprobar** → **⋯** → **Aprobar gasto** (o **Rechazar**).
4. Cambia a **Tesorería** → en el gasto **Aprobado** → **⋯** → **Marcar como pagado**.

✅ **Verifica:** sube "Egresos pagados" y baja "Saldo en caja".

**Disciplinario — fallo**
5. Como **Presidencia**, en un expediente en etapa **Decisión** → **Sancionar** / **Absolver**
   (o **Archivar** en cualquier etapa).

**Gobernanza — cerrar votación**
6. En **Votaciones**, vota si quieres, y usa **Cerrar votación** → se declara
   **Aprobada** o **Rechazada** según la mayoría.

---

## 4. Flujo recomendado de punta a punta

Sigue este orden para probar la separación de funciones y los efectos cruzados:

1. **Secretaría** → registra 2–3 afiliados (quedan Pendiente).
2. **Presidencia** → aprueba los afiliados.
3. **Tesorería** → registra 1 ingreso y 1 gasto (usa fechas de meses distintos).
4. **Presidencia** → aprueba el gasto.
5. **Tesorería** → marca el gasto como pagado.
6. **Fiscal** → abre un expediente y lo lleva hasta *Decisión*.
7. **Presidencia** → dicta el fallo del expediente.
8. **Secretaría** → agenda una sesión + registra acta; abre una votación y vota.
9. **Presidencia** → cierra la votación.
10. **Secretaría** → carga un documento, envía un comunicado y crea un comité.
11. **Cualquier rol** → abre **Reportes** y revisa el consolidado; usa **Exportar CSV**.

---

## 5. Verificación de efectos cruzados (lo que confirma que "todo funciona")

| Acción | Dónde se refleja |
|---|---|
| Aprobar un afiliado | Dashboard y Reportes ("Afiliados activos"); Comunicaciones (destinatarios "Activos") |
| Registrar / pagar movimientos | Dashboard ("Recaudo", "Saldo"); Financiero (tarjetas y "Flujo de caja"); Reportes |
| Abrir / fallar expedientes | Dashboard y Reportes ("Procesos activos", "próximos a vencer") |
| Agendar sesión | Dashboard ("Próximas sesiones") y Gobernanza |
| Votaciones, documentos, comunicados, comités | Reportes ("Resumen operativo consolidado") |

---

## 6. Checklist de prueba

- [ ] Secretaría registra afiliados pero **no** aprueba (aparece 🔒); **Presidencia** aprueba.
- [ ] Tesorería registra pero **no** aprueba gastos; Presidencia aprueba; Tesorería paga.
- [ ] Fiscal instruye pero **no** falla; Presidencia dicta el fallo.
- [ ] Secretaría abre votaciones y vota, pero **solo Presidencia** cierra.
- [ ] Cada rol ve **solo** sus módulos en el menú.
- [ ] Los números del Dashboard y Reportes cambian al operar en los módulos.
- [ ] "Exportar CSV" en Reportes descarga el consolidado.
- [ ] "Reiniciar demo" deja todo vacío otra vez.

---

*Documento de apoyo para pruebas del prototipo. Los datos son simulados y viven en el
navegador; no hay backend ni información real de afiliados.*
