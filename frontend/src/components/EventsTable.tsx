import { format } from "date-fns";
import type { Evento } from "../lib/types";

function label(tipo: Evento["tipo_evento"]): string {
  if (tipo === "porta_aberta") return "Porta aberta";
  if (tipo === "porta_fechada") return "Porta fechada";
  if (tipo === "alarme_disparado") return "Alarme disparado";
  if (tipo === "botao_panico_ativado") return "Botão de pânico ativado";
  if (tipo === "botao_panico_desativado") return "Botão de pânico desativado";
  return "Temperatura fora do padrão";
}

export function EventsTable({ eventos }: { eventos: Evento[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-600 dark:text-slate-400">
          <tr>
            <th className="py-2">Data/Hora</th>
            <th className="py-2">Dispositivo</th>
            <th className="py-2">Evento</th>
            <th className="py-2">Duração</th>
          </tr>
        </thead>
        <tbody className="text-slate-900 dark:text-slate-200">
          {eventos.map((e) => (
            <tr key={e.id} className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-2">{format(new Date(e.data_hora), "dd/MM HH:mm:ss")}</td>
              <td className="py-2">{e.dispositivo_nome}</td>
              <td className="py-2">{label(e.tipo_evento)}</td>
              <td className="py-2">{e.duracao_segundos ?? "--"}</td>
            </tr>
          ))}
          {eventos.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-4 text-center text-slate-500">
                Sem eventos no período.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
