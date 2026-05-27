export const LEAGUES = [
  { id: 71, name: "Brasileirão Série A" },
  { id: 72, name: "Brasileirão Série B" },
  { id: 73, name: "Copa do Brasil" },
  { id: 15, name: "Copa do Mundo" }
];

export async function fetchFixturesByDateAndLeague(dateStr, leagueId) {
  const apiKey = import.meta.env.VITE_API_SPORTS_KEY;
  if (!apiKey) {
    throw new Error("Chave da API-Sports não encontrada no .env");
  }

  // The season is usually the year of the date
  const year = dateStr.split('-')[0];

  try {
    const response = await fetch(\`https://v3.football.api-sports.io/fixtures?date=\${dateStr}&league=\${leagueId}&season=\${year}\`, {
      method: "GET",
      headers: {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": apiKey
      }
    });

    const data = await response.json();
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("API-Sports error:", data.errors);
      throw new Error("Erro na API-Sports. Verifique o console.");
    }

    // Transform response into our format
    return data.response.map(fixture => ({
      id: fixture.fixture.id,
      date: fixture.fixture.date.split('T')[0],
      time: fixture.fixture.date.split('T')[1].substring(0, 5),
      homeTeam: fixture.teams.home.name,
      awayTeam: fixture.teams.away.name,
      status: fixture.fixture.status.short, // e.g., 'NS' (Not Started), 'FT' (Full Time)
      homeScore: fixture.goals.home,
      awayScore: fixture.goals.away
    }));
  } catch (error) {
    console.error("Erro ao buscar jogos:", error);
    throw error;
  }
}
