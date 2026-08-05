"use client";
// components/tareas/doing-sessions-context.tsx
// Estado compartido de "que tarea estoy haciendo ahora mismo" (activar, pausar,
// reanudar, cronometro de 50 min), guardado en localStorage. Antes vivia local
// dentro de KanbanBoard; ahora lo consumen DOS pestanas distintas (Proceso y
// Repetitivas), y Base UI Tabs DESMONTA el contenido de la pestana inactiva por
// defecto (verificado en el codigo fuente de @base-ui/react/tabs: sin
// keepMounted, el panel inactivo hace return null). Si cada pestana tuviera su
// propio estado local, cambiar de pestana destruiria el intervalo del
// cronometro y las dos vistas podrian desincronizarse. Por eso este Provider
// vive UNA vez, por encima del <Tabs>, en TareasView: una sola fuente de
// verdad que ambas pestanas comparten en vivo.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  pauseDoingTimer,
  resumeDoingTimer,
  startDoingTimer,
  type DoingTimer,
} from "@/lib/utils/doing-timer";
import type { TaskWithProject } from "@/types/db";

type DoingTimers = Record<string, DoingTimer>;

const DOING_TASK_STORAGE_KEY = "tablero-divergente:doing-tasks";
const LEGACY_DOING_TASK_STORAGE_KEY = "tablero-divergente:doing-task";
const DOING_TIMERS_STORAGE_KEY = "tablero-divergente:doing-timers";

interface DoingSessionsValue {
  doingTaskIds: string[];
  doingTimers: DoingTimers;
  toggleDoing: (taskId: string) => void;
  pauseDoing: (taskId: string) => void;
  resumeDoing: (taskId: string) => void;
}

const DoingSessionsContext = createContext<DoingSessionsValue | null>(null);

/**
 * `tasks` son TODAS las tareas relevantes para podar sesiones huerfanas (una
 * tarea que se archivo, se borro, o dejo de estar en_progreso/con dias
 * semanales no deberia quedar "haciendo" para siempre). Se pasan las de
 * Kanban + las semanales juntas para que ninguna de las dos vistas pierda su
 * propio criterio de validez.
 */
export function DoingSessionsProvider({
  tasks,
  children,
}: {
  tasks: TaskWithProject[];
  children: ReactNode;
}) {
  const [doingTaskIds, setDoingTaskIds] = useState<string[]>([]);
  const [doingTimers, setDoingTimers] = useState<DoingTimers>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(DOING_TASK_STORAGE_KEY);
    const legacyTaskId = window.localStorage.getItem(LEGACY_DOING_TASK_STORAGE_KEY);
    try {
      const parsed = stored ? JSON.parse(stored) : legacyTaskId ? [legacyTaskId] : [];
      setDoingTaskIds(
        Array.isArray(parsed)
          ? parsed.filter((id): id is string => typeof id === "string")
          : [],
      );
    } catch {
      setDoingTaskIds(legacyTaskId ? [legacyTaskId] : []);
    }
    const storedTimers = window.localStorage.getItem(DOING_TIMERS_STORAGE_KEY);
    try {
      const parsedTimers = storedTimers ? JSON.parse(storedTimers) : {};
      setDoingTimers(
        parsedTimers && typeof parsedTimers === "object" && !Array.isArray(parsedTimers)
          ? parsedTimers
          : {},
      );
    } catch {
      setDoingTimers({});
    }
    setLoaded(true);
  }, []);

  // Poda sesiones de tareas que ya no son validas, y arranca un cronometro
  // fresco de 50 min para las que vienen de antes de esta funcion (localStorage
  // viejo con la tarea marcada pero sin cronometro asociado).
  //
  // "Valida" = existe Y no esta 'hecho'. Antes de compartir este estado con el
  // panel semanal, aqui se exigia ademas status === 'en_progreso' (el unico
  // lugar donde Kanban mostraba el boton). Se aflojo a "cualquier estado" para
  // que una tarea semanal en 'todo' (que Kanban ni siquiera muestra "haciendo")
  // pueda seguir activa desde el panel semanal -- pero aflojarlo DEL TODO fue
  // un error: una tarea que llega a 'hecho' (arrastrada en Kanban, por
  // ejemplo) dejaba de tener CUALQUIER control visible para pausarla o
  // detenerla (Kanban solo pinta el control en en_progreso; el panel semanal
  // solo la muestra si tiene weekly_days) y su cronometro seguia corriendo
  // para siempre en silencio. Excluir 'hecho' aqui restaura esa poda sin
  // perder la flexibilidad que necesita el panel semanal.
  useEffect(() => {
    if (!loaded) return;
    const validTaskIds = doingTaskIds.filter((id) =>
      tasks.some((t) => t.id === id && t.status !== "hecho"),
    );
    if (validTaskIds.length !== doingTaskIds.length) {
      setDoingTaskIds(validTaskIds);
      return;
    }
    if (validTaskIds.length) {
      window.localStorage.setItem(DOING_TASK_STORAGE_KEY, JSON.stringify(validTaskIds));
      window.localStorage.removeItem(LEGACY_DOING_TASK_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(DOING_TASK_STORAGE_KEY);
    }

    setDoingTimers((current) => {
      const next: DoingTimers = {};
      for (const id of validTaskIds) next[id] = current[id] ?? startDoingTimer();
      const sameSet =
        Object.keys(current).length === Object.keys(next).length &&
        Object.keys(next).every((id) => current[id] === next[id]);
      return sameSet ? current : next;
    });
  }, [doingTaskIds, loaded, tasks]);

  // Persiste los cronometros cada vez que cambian (arrancar, pausar, reanudar,
  // podar). Separado del efecto de arriba porque pausar/reanudar no toca
  // doingTaskIds y por lo tanto no dispara ese efecto.
  useEffect(() => {
    if (!loaded) return;
    if (Object.keys(doingTimers).length) {
      window.localStorage.setItem(DOING_TIMERS_STORAGE_KEY, JSON.stringify(doingTimers));
    } else {
      window.localStorage.removeItem(DOING_TIMERS_STORAGE_KEY);
    }
  }, [doingTimers, loaded]);

  function toggleDoing(taskId: string) {
    const isDoing = doingTaskIds.includes(taskId);
    setDoingTaskIds((current) =>
      isDoing ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
    // Activar arranca un cronometro nuevo de 50 minutos; desactivar lo borra
    // (el requisito es que desaparezca, no que quede pausado en el fondo).
    setDoingTimers((current) => {
      if (isDoing) {
        return Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== taskId),
        );
      }
      return { ...current, [taskId]: startDoingTimer() };
    });
  }

  function pauseDoing(taskId: string) {
    setDoingTimers((current) => {
      const timer = current[taskId];
      if (!timer) return current;
      return { ...current, [taskId]: pauseDoingTimer(timer) };
    });
  }

  function resumeDoing(taskId: string) {
    setDoingTimers((current) => {
      const timer = current[taskId];
      if (!timer) return current;
      return { ...current, [taskId]: resumeDoingTimer(timer) };
    });
  }

  return (
    <DoingSessionsContext.Provider
      value={{ doingTaskIds, doingTimers, toggleDoing, pauseDoing, resumeDoing }}
    >
      {children}
    </DoingSessionsContext.Provider>
  );
}

export function useDoingSessions(): DoingSessionsValue {
  const ctx = useContext(DoingSessionsContext);
  if (!ctx) {
    throw new Error("useDoingSessions debe usarse dentro de DoingSessionsProvider");
  }
  return ctx;
}

/** Termina la sesion activa de `taskId` sin dejarla pausada (para cuando se
 * completa una ocurrencia y no tiene sentido seguir "haciendola"). */
export function useStopIfDoing() {
  const { doingTaskIds, toggleDoing } = useDoingSessions();
  return (taskId: string) => {
    if (doingTaskIds.includes(taskId)) toggleDoing(taskId);
  };
}
