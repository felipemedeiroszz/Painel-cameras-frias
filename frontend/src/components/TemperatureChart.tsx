import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Leitura } from "../lib/types";

type Point = {
  time: string;
  temperatura: number;
  tipo_registro: Leitura["tipo_registro"];
};

function toPoints(leituras: Leitura[]): Point[] {
  return leituras
    .slice()
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .map((l) => ({
      time: format(new Date(l.data_hora), "HH:mm"),
      temperatura: l.temperatura,
      tipo_registro: l.tipo_registro
    }));
}

export function TemperatureChart({ leituras, horarios }: { leituras: Leitura[]; horarios: string[] }) {
  const data = toPoints(leituras);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeOpacity={0.15} />
          <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} width={42} />
          <Tooltip
            contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={(value: unknown) => [`${Number(value).toFixed(1)}°C`, "Temperatura"]}
          />

          {horarios.map((h) => (
            <ReferenceLine
              key={h}
              x={h}
              stroke="#64748b"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
            />
          ))}

          <Line
            type="monotone"
            dataKey="temperatura"
            stroke="#22c55e"
            strokeWidth={2}
            dot={(props) => {
              const p = props.payload as Point;
              const fill = p.tipo_registro === "automatico" ? "#f59e0b" : "#22c55e";
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={p.tipo_registro === "automatico" ? 3 : 2}
                  fill={fill}
                  stroke="#0f172a"
                  strokeWidth={1}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

