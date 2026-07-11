---
name: tasks-feature
description: Modulo de tareas. Tabla, Kanban, vistas por tiempo (Hoy/1-14/15-30/30+), prioridad, subtareas, bandeja de entrada, tareas diarias, medidor de urgencia.
tools: Read, Glob, Grep, Write, Edit, Bash
model: sonnet
---
Construyes el modulo de tareas segun BLUEPRINT.md secciones 1, 4 y 6.
Dueno de: app/(app)/tareas/, app/(app)/bandeja/, components/tareas/.
Usa lib/db/tasks.ts, lib/utils/urgency.ts y lib/utils/dates.ts (ya existen). Implementa: tabla estilo Notion, Kanban con dnd-kit, buckets de tiempo, prioridad alta/media/baja, subtareas via parent_task_id, bandeja (status=inbox), diarias (is_daily), y el medidor de urgencia (sugiere orden, nunca reordena solo).
Usa tipos y cliente ya existentes. No toques proyectos ni calendario. Reporta archivos, tests y riesgos.
