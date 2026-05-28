import { GoogleGenAI } from '@google/genai';

export async function fetchGameResultWithAI(homeTeam, awayTeam, dateStr) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "sua_chave_gemini") {
    throw new Error("Chave da API do Gemini não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Você é um assistente especializado em futebol.
Eu preciso saber o resultado do jogo entre ${homeTeam} (Mandante) e ${awayTeam} (Visitante) que ocorreu ou está marcado para a data ${dateStr}.

Se você tem conhecimento do resultado final ou do PLACAR PARCIAL ATUAL deste jogo (caso ele esteja acontecendo agora), retorne APENAS um objeto JSON estrito com o seguinte formato:
{"found": true, "homeScore": 2, "awayScore": 1}

Se o jogo ainda não começou, foi cancelado, ou você não consegue encontrar nenhuma informação de placar para ele hoje, retorne APENAS:
{"found": false}

Não inclua nenhum texto adicional, apenas o JSON válido.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0,
        tools: [{ googleSearch: {} }]
      }
    });

    let textResponse = response.text.trim();
    // Extrai apenas a parte que é JSON (objeto), caso o Gemini adicione texto em volta
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      return result;
    }
    
    return { found: false };
  } catch (error) {
    console.error("Erro ao consultar a IA Gemini (Placar):", error);
    return { found: false };
  }
}

export async function fetchFixturesWithAI(dateStr, leagueName) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === "sua_chave_gemini") {
    throw new Error("Chave da API do Gemini não configurada.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Você é um assistente especializado em futebol e calendários esportivos.
Eu preciso da lista de jogos OFICIAIS marcados para o campeonato "${leagueName}" na data ${dateStr}.

IMPORTANTE: 
1. Retorne APENAS um array JSON estrito contendo os jogos.
2. Não adicione NENHUM texto antes ou depois do JSON. Sem saudações.
3. Se não houver jogos para esta data e liga, retorne um array vazio: []

O formato JSON de cada jogo deve ser exato:
[
  {
    "time": "16:00",
    "homeTeam": "Flamengo",
    "awayTeam": "Vasco",
    "date": "${dateStr}"
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0,
        tools: [{ googleSearch: {} }]
      }
    });

    let textResponse = response.text.trim();
    // Extrai apenas a parte que é JSON (array), ignorando o texto em volta
    const match = textResponse.match(/\[[\s\S]*\]/);
    if (match) {
      const result = JSON.parse(match[0]);
      return Array.isArray(result) ? result : [];
    }
    
    return [];
  } catch (error) {
    console.error("Erro ao buscar jogos com IA Gemini:", error);
    throw new Error(`Falha Gemini: ${error.message}`);
  }
}
