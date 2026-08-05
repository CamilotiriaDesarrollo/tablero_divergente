# Creador de imágenes · Divergente

Espacio de trabajo para crear imágenes de contenido con la identidad de Divergente.
Aquí viven las referencias, los prompts, el tablero de trabajo y las piezas que
vayamos generando. El **agente creador de imágenes** (en `.claude/agents/`) usa
todo esto para producir imágenes coherentes con la marca.

## Estructura

| Carpeta | Qué va aquí |
|---|---|
| `referencias/` | Las 2 imágenes de **estilo/marca** (cómo se ve lo nuestro). |
| `concepto/` | La imagen cuyo **concepto** queremos copiar/replicar. |
| `prompts/` | El **.md con los prompts** y toda la información de generación. |
| `generadas/` | Las **imágenes que creemos** (resultados y borradores). |

- `TABLERO.md` — el tablero de trabajo de creación de imágenes (cola y estados).

## Flujo de trabajo

1. Dejas las **2 referencias** en `referencias/`, la **imagen concepto** en
   `concepto/` y el **.md de prompts** en `prompts/`.
2. Con eso construyo el **agente creador de imágenes** y lleno el `TABLERO.md`.
3. Para cada pieza: el agente arma el prompt afinado (según marca + concepto),
   generas la imagen en tu herramienta, y la guardamos en `generadas/`.
4. El tablero registra qué está por hacer, en proceso y listo.

> Nota técnica: las imágenes (binarios) no se suben al repositorio ni a la web;
> quedan solo en esta carpeta local (respaldada por OneDrive). Los textos
> (prompts, tablero) sí se versionan.
