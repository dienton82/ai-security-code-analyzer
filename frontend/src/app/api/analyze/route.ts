import { NextResponse } from "next/server";

type Language = "javascript" | "typescript" | "python";
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Vulnerability = {
  type: string;
  severity: Severity;
  line: number;
  description: string;
  recommendation: string;
};

type AnalyzeRequest = {
  language?: Language;
  code?: string;
};

type AnalyzeResponse = {
  summary: string;
  vulnerabilities: Vulnerability[];
  score: number;
};

const SUPPORTED_LANGUAGES: Language[] = ["javascript", "typescript", "python"];

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  LOW: 8,
  MEDIUM: 18,
  HIGH: 30,
  CRITICAL: 45,
};

type Rule = {
  type: string;
  severity: Severity;
  description: string;
  recommendation: string;
  test: RegExp;
};

const RULES: Rule[] = [
  {
    type: "SQL Injection",
    severity: "HIGH",
    description: "Se detecto posible concatenacion de entrada de usuario dentro de una consulta SQL.",
    recommendation: "Usa consultas parametrizadas o un ORM con binding seguro de parametros.",
    test: /(SELECT|INSERT|UPDATE|DELETE)[\s\S]*(\+|f["'`]|format\(|%s)/i,
  },
  {
    type: "Command Injection",
    severity: "CRITICAL",
    description: "Se encontro construccion dinamica de comandos del sistema con datos potencialmente controlados por el usuario.",
    recommendation: "Evita shell interpolation y usa APIs con argumentos separados y listas permitidas.",
    test: /(exec|system|popen|spawn|subprocess\.(run|Popen))[\s\S]*(\+|\$\{|f["'`])/i,
  },
  {
    type: "Hardcoded Secret",
    severity: "HIGH",
    description: "Hay un secreto o credencial posiblemente embebido en el codigo fuente.",
    recommendation: "Mueve credenciales a variables de entorno o a un gestor de secretos.",
    test: /(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,}["']/i,
  },
  {
    type: "Insecure Randomness",
    severity: "MEDIUM",
    description: "Se detecto un generador pseudoaleatorio no adecuado para contextos sensibles.",
    recommendation: "Usa un generador criptograficamente seguro para tokens, claves o codigos.",
    test: /(Math\.random|random\.random\()/i,
  },
  {
    type: "Cross-Site Scripting",
    severity: "HIGH",
    description: "Hay una insercion potencialmente insegura de HTML o contenido no sanitizado.",
    recommendation: "Escapa o sanitiza la salida antes de renderizar contenido HTML.",
    test: /(dangerouslySetInnerHTML|innerHTML\s*=|document\.write\()/i,
  },
];

function getLineNumber(code: string, pattern: RegExp) {
  const match = pattern.exec(code);

  if (!match || match.index === undefined) {
    return 1;
  }

  return code.slice(0, match.index).split("\n").length;
}

function analyzeCode(language: Language, code: string): AnalyzeResponse {
  const vulnerabilities = RULES.filter((rule) => rule.test.test(code)).map((rule) => ({
    type: rule.type,
    severity: rule.severity,
    line: getLineNumber(code, rule.test),
    description: `${rule.description} Lenguaje analizado: ${language}.`,
    recommendation: rule.recommendation,
  }));

  const penalty = vulnerabilities.reduce((total, current) => total + SEVERITY_WEIGHTS[current.severity], 0);
  const score = Math.max(0, 100 - penalty);

  if (vulnerabilities.length === 0) {
    return {
      summary: `No se detectaron vulnerabilidades obvias para ${language} con las reglas actuales.`,
      vulnerabilities: [],
      score: 95,
    };
  }

  const findingsLabel = vulnerabilities.length === 1 ? "1 posible vulnerabilidad" : `${vulnerabilities.length} posibles vulnerabilidades`;

  return {
    summary: `${findingsLabel} detectadas en ${language}.`,
    vulnerabilities,
    score,
  };
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;

  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const language = body.language;
  const code = body.code?.trim();

  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: "Lenguaje no soportado." }, { status: 400 });
  }

  if (!code || code.length < 10) {
    return NextResponse.json({ error: "El codigo debe tener al menos 10 caracteres." }, { status: 400 });
  }

  const result = analyzeCode(language, code);
  return NextResponse.json(result);
}
