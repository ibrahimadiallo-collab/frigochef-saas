/**
 * Estrae JSON dall'output di un LLM in modo tollerante:
 * 1) parse diretto, 2) rimozione dei code fence markdown, 3) regex sul primo blocco {...} o [...].
 * Restituisce `null` se nessuna strategia funziona.
 */
export function extractJson(text: string | undefined | null): unknown {
  if (!text) return null;
  const candidates: string[] = [text.trim()];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstObj = text.indexOf('{');
  const lastObj = text.lastIndexOf('}');
  if (firstObj !== -1 && lastObj > firstObj) candidates.push(text.slice(firstObj, lastObj + 1));

  const firstArr = text.indexOf('[');
  const lastArr = text.lastIndexOf(']');
  if (firstArr !== -1 && lastArr > firstArr) candidates.push(text.slice(firstArr, lastArr + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Prova a ripulire virgole finali, errore comune degli LLM.
      try {
        return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        /* prossimo candidato */
      }
    }
  }
  return null;
}
