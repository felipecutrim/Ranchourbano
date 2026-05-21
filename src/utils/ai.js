import Anthropic from '@anthropic-ai/sdk';

export async function fetchGameResultWithAI(homeTeam, awayTeam, dateStr) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sua_chave_anthropic") {
    throw new Error("Chave da API da Anthropic não configurada.");
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Necessário para rodar no client-side
  });

  const prompt = `Você é um assistente especializado em futebol.
Eu preciso saber o resultado final do jogo entre ${homeTeam} (Mandante) e ${awayTeam} (Visitante) que ocorreu ou estava marcado para a data ${dateStr}.

Se você tem conhecimento do resultado real deste jogo, retorne APENAS um objeto JSON estrito com o seguinte formato:
{"found": true, "homeScore": 2, "awayScore": 1}

Se o jogo ainda não terminou, foi cancelado, ou você não tem certeza absoluta do resultado real final porque sua base de dados não contempla esse dia específico, retorne APENAS:
{"found": false}

Não inclua nenhum texto adicional, apenas o JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 100,
      temperature: 0,
      system: "Você é uma API de dados esportivos. Você só responde com JSON válido.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const textResponse = response.content[0].text.trim();
    // Tenta extrair o JSON do texto, caso o modelo inclua formatação markdown
    const jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return result;
  } catch (error) {
    console.error("Erro ao consultar a IA:", error);
    return { found: false };
  }
}
