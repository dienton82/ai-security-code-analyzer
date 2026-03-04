"use client";

import { useMemo, useState } from "react";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Vulnerability = {
  type: string;
  severity: Severity;
  line: number;
  description: string;
  recommendation: string;
};

type AnalyzeResponse = {
  summary: string;
  vulnerabilities: Vulnerability[];
  score: number;
};

type AnalyzeErrorResponse = {
  error?: string;
};

function isAnalyzeResponse(payload: AnalyzeResponse | AnalyzeErrorResponse): payload is AnalyzeResponse {
  return "summary" in payload && "vulnerabilities" in payload && "score" in payload;
}

const LANGS = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
] as const;

export default function Home() {
  const [language, setLanguage] = useState<(typeof LANGS)[number]["value"]>("typescript");
  const [code, setCode] = useState(
    `// Pega tu código aquí\nfunction login(user, password) {\n  return user + password;\n}\n`
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const isValid = useMemo(() => code.trim().length >= 10, [code]);

  async function onAnalyze() {
    setError(null);
    setResult(null);

    if (!isValid) {
      setError("El código debe tener al menos 10 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
        }),
      });

      const payload: AnalyzeResponse | AnalyzeErrorResponse = await res.json();

      if (!res.ok) {
        const errorMessage =
          "error" in payload ? (payload.error ?? "No se pudo analizar el código. Intenta de nuevo.") : "No se pudo analizar el código. Intenta de nuevo.";
        setError(errorMessage);
        return;
      }

      if (!isAnalyzeResponse(payload)) {
        setError("La respuesta del servicio no tiene el formato esperado.");
        return;
      }

      setResult(payload);
    } catch {
      setError("No se pudo conectar con el servicio de análisis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            AI Security Code Analyzer
          </h1>
          <p className="text-sm text-zinc-300 sm:text-base">
            Pega tu código, elige lenguaje y genera un análisis de riesgos (OWASP) con salida estructurada.
          </p>
        </header>

        <section className="mt-6 grid gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm text-zinc-300">
                Lenguaje
                <select
                  className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-600 sm:w-56"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as (typeof LANGS)[number]["value"])}
                >
                  {LANGS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={onAnalyze}
                disabled={loading || !isValid}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analizando..." : "Analizar"}
              </button>
            </div>

            <label className="text-sm text-zinc-300">
              Código
              <textarea
                className="mt-1 h-64 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-600 sm:h-80"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          {result && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Resultado</h2>
                <div className="text-sm text-zinc-300">
                  Score: <span className="font-semibold text-zinc-100">{result.score}/100</span>
                </div>
              </div>

              <p className="mt-2 text-sm text-zinc-200">{result.summary}</p>

              <div className="mt-4 space-y-3">
                {result.vulnerabilities.map((v) => (
                  <div
                    key={`${v.type}-${v.line}-${v.severity}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-semibold">
                        {v.type} <span className="text-zinc-400">· Línea {v.line}</span>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
                        {v.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{v.description}</p>
                    <p className="mt-2 text-sm text-zinc-300">
                      <span className="font-semibold text-zinc-100">Recomendación:</span>{" "}
                      {v.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-10 text-xs text-zinc-500">
          v0.1 — UI responsive lista. Próximo: endpoint real + validación + rate limit.
        </footer>
      </div>
    </main>
  );
}
