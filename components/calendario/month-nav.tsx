"use client";
// components/calendario/month-nav.tsx
// Navegacion entre meses. Actualiza ?mes=YYYY-MM via navegacion real (Link), asi
// la page.tsx (RSC) vuelve a consultar getTasksInRange para el mes elegido.
import * as React from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMonthTitle,
  nextMonthParam,
  parseMonthParam,
  prevMonthParam,
  toMonthParam,
} from "./month-range";

export function MonthNav({ monthISO }: { monthISO: string }) {
  const ref = parseMonthParam(monthISO);
  const prev = prevMonthParam(ref);
  const next = nextMonthParam(ref);

  // El mes actual depende de la zona horaria del cliente: se resuelve tras
  // montar para no arriesgar un desajuste de hidratacion en el boton "Hoy".
  const [currentMonth, setCurrentMonth] = React.useState<string | null>(null);
  React.useEffect(() => {
    setCurrentMonth(toMonthParam(new Date()));
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
        {formatMonthTitle(ref)}
      </h1>
      <div className="flex items-center gap-1">
        {currentMonth !== null && monthISO !== currentMonth && (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/calendario?mes=${currentMonth}`} />}
          >
            Hoy
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/calendario?mes=${prev}`} aria-label="Mes anterior" />}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/calendario?mes=${next}`} aria-label="Mes siguiente" />}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
