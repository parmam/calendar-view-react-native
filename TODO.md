"# TODO List: Mejoras, Limpieza y Optimizaciones para el Proyecto de Calendario

Basado en el análisis detallado realizado en los informes previos (funcionalidades soportadas, código innecesario/malas prácticas, y mejoras propuestas), he compilado todo lo mencionado en una lista de tareas accionables. La he organizado en secciones para mayor claridad, priorizando por impacto (alto, medio, bajo) como en el informe de mejoras. Cada ítem incluye una breve descripción, el archivo principal afectado (basado en el análisis), y una estimación de esfuerzo (bajo/medio/alto).

He usado un formato de lista con checkboxes para que sea fácil de rastrear (puedes marcarlas como completadas en un documento o tool como GitHub Issues). Esto cubre **todo lo mencionado** en los informes, transformado en tareas prácticas. Nota: Se ha excluido la tarea de eliminar el manejo de actualizaciones OTA como solicitado.

## Sección 1: Limpieza de Código Innecesario y Corrección de Malas Prácticas

Estos ítems abordan código redundante, mezclas de responsabilidades, inconsistencias en APIs, y problemas de rendimiento/seguridad identificados.

- [ ] **Externalizar generación de eventos de muestra**: Mover `generateSampleEvents` (~líneas 30-200 en `App.tsx`) a un archivo separado (e.g., `fixtures/events.ts`) y hacerlo configurable por locale. (Archivo: `App.tsx`; Impacto: Medio; Esfuerzo: Bajo)
- [ ] **Condicionar DebugControls por entorno**: Envolver el componente `DebugControls` (~líneas 203-331 en `App.tsx`) en `__DEV__` para que no se renderice en producción. (Archivo: `App.tsx`; Impacto: Medio; Esfuerzo: Bajo)
- [ ] **Limpiar refs y estados no usados**: Eliminar refs/estados redundantes (e.g., `hourHeight` en `DraggableEvent.tsx` si no se usa; `dragStartTime` en `Calendar.tsx` si se puede optimizar). (Archivos: `DraggableEvent.tsx`, `Calendar.tsx`; Impacto: Bajo; Esfuerzo: Bajo)
- [ ] **Eliminar código comentado/obsoleto**: Borrar comentarios y código muerto (e.g., sobre "pinchRef ya no es necesario" en `Calendar.tsx`). (Archivo: `Calendar.tsx`; Impacto: Bajo; Esfuerzo: Bajo)
- [ ] **Refactorizar mezcla de responsabilidades en App.tsx**: Separar demo de calendario, logging setup y debug UI en componentes/módulos independientes. (Archivo: `App.tsx`; Impacto: Alto; Esfuerzo: Medio)
- [ ] **Unificar APIs de gestos**: Migrar todo de PanResponder a Gesture Handler (e.g., drag-create en `Calendar.tsx`). (Archivos: `Calendar.tsx`, `DraggableEvent.tsx`; Impacto: Alto; Esfuerzo: Medio)
- [ ] **Implementar resizing de eventos**: Agregar soporte para `isResizable` con handles de arrastre en `DraggableEvent.tsx`. (Archivo: `DraggableEvent.tsx`; Impacto: Medio; Esfuerzo: Alto)
- [ ] **Optimizar dependencias en efectos**: Reducir dependencias amplias en useEffect (e.g., logging en `App.tsx`). (Archivo: `App.tsx`; Impacto: Medio; Esfuerzo: Bajo)
- [ ] **Agregar validación estricta de props y errores**: Incluir chequeos en funciones como `handleDragEnd` y try-catch en callbacks. (Archivos: `Calendar.tsx`, `DraggableEvent.tsx`; Impacto: Alto; Esfuerzo: Bajo)
- [ ] **Reemplazar magic numbers por constantes**: Mover números como 60000 o 30 a `calendarConfig.ts`. (Archivos: `Calendar.tsx`, `DraggableEvent.tsx`; Impacto: Bajo; Esfuerzo: Bajo)
- [ ] **Mejorar estilos**: Convertir estilos inline a StyleSheet en todos los componentes. (Archivos: `CalendarHeader.tsx`, `App.tsx`; Impacto: Bajo; Esfuerzo: Bajo)
- [ ] **Usar UUID para IDs de eventos**: Reemplazar `Date.now()` por una librería como `expo-crypto` para IDs únicos. (Archivo: `App.tsx`; Impacto: Medio; Esfuerzo: Bajo)
- [ ] **Parametrizar datos hardcodeados**: Hacer que eventos de muestra en `App.tsx` sean configurables por locale. (Archivo: `App.tsx`; Impacto: Bajo; Esfuerzo: Bajo)

## Sección 2: Mejoras Propuestas (Nuevas Funcionalidades y Optimizaciones)

Estos ítems provienen del informe de mejoras, enfocados en rendimiento, usabilidad y completitud.

- [ ] **Migrar gestos a una API unificada (Gesture Handler completo)**: Completar migración y habilitar gestures simultáneos. (Archivo: `Calendar.tsx`; Impacto: Alto; Esfuerzo: Medio)
- [ ] **Optimizar rendimiento en rejilla**: Implementar virtualización con FlatList en `SimpleTimeGrid.tsx` y memoización en cálculos como `getEventPosition`. (Archivo: `SimpleTimeGrid.tsx`; Impacto: Alto; Esfuerzo: Medio)
- [ ] **Refactorizar estado y contexto**: Hacer setters obligatorios en `CalendarContext.tsx` y usar reducers para estado complejo. (Archivo: `CalendarContext.tsx`; Impacto: Medio; Esfuerzo: Medio)
- [ ] **Agregar soporte completo para recurrencia y resizing**: Implementar edición de series y gestures para resize. (Archivos: `MonthView.tsx`, `DraggableEvent.tsx`; Impacto: Medio; Esfuerzo: Alto)
- [ ] **Mejoras en UI/UX**: Agregar tooltips, búsqueda de eventos y accesibilidad (VoiceOver). (Archivos: `SimpleTimeGrid.tsx`, `MonthView.tsx`; Impacto: Medio; Esfuerzo: Medio)
- [ ] **Extraer constantes y utilidades**: Centralizar en `calendarConfig.ts`. (Archivo: `calendarConfig.ts`; Impacto: Bajo; Esfuerzo: Bajo)
- [ ] **Agregar tests unitarios**: Cubrir funciones clave como `groupOverlappingEvents` y hooks. (Nuevo archivo: tests/; Impacto: Bajo; Esfuerzo: Alto)
- [ ] **Expandir documentación**: Actualizar README con ejemplos detallados. (Archivo: `README.md`; Impacto: Bajo; Esfuerzo: Medio)
- [ ] **Optimizaciones menores**: Agregar `useMemo` en renders, auditar dependencias (e.g., lodash). (Varios archivos; Impacto: Bajo; Esfuerzo: Bajo)

## Sección 3: Verificación de Funcionalidades Soportadas

Estos ítems son para confirmar/validar las features existentes mencionadas en el informe (no tareas nuevas, pero útiles para un TODO de auditoría).

- [ ] Verificar vistas de calendario (day, 3day, week, workWeek, month).
- [ ] Verificar navegación temporal y entre vistas.
- [ ] Verificar visualización y gestión de eventos (creación, update, delete).
- [ ] Verificar drag-and-drop y snapping.
- [ ] Verificar eventos recurrentes y all-day.
- [ ] Verificar personalización (tema, rango horario, locale).
- [ ] Verificar feedback háptico y modal de confirmación.
- [ ] Verificar logging y performance configs.

## Notas Generales

- **Prioridad Total**: Enfócate primero en limpieza (Sección 1) para estabilizar, luego en mejoras de alto impacto (Sección 2).
- **Herramientas Recomendadas**: ESLint para linting, Prettier para formato, Jest para tests, y Git para branching (e.g., `feat/refactor-gestures`).
- **Estimación de Tiempo**: Asumiendo un dev full-time, Sección 1: 1-2 días; Sección 2: 3-5 días; Sección 3: 1 día para validación.
- **Próximos Pasos**: Si necesitas código para alguna tarea (e.g., via `edit_file`), indícalo. Esto se basa en el análisis de `App.tsx` (línea 736, en el código de updates innecesario) y el proyecto general."
