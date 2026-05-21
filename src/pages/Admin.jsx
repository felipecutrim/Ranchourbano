import React, { useState, useEffect } from 'react';
import { useBolaoData } from '../hooks/useBolaoData';
import { ShieldAlert, Plus, Trash2, Bot, RefreshCw } from 'lucide-react';
import { fetchGameResultWithAI } from '../utils/ai';

export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  
  const { currentWeek, games, addGame, removeGame, updateGameStatus, updateGameResult, startNewWeek, loading } = useBolaoData();

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('');
  
  const [results, setResults] = useState({});

  // --- AUTOMATION LOOP ---
  useEffect(() => {
    if (!auth || games.length === 0) return;

    const checkAutomations = async () => {
      const now = new Date();

      for (const g of games) {
        if (!g.date || !g.time) continue;
        
        // Parse game start time
        const gameDateTime = new Date(`${g.date}T${g.time}`);
        const diffInMinutes = (now - gameDateTime) / (1000 * 60);

        // Rule 1: > 0 mins => In Progress
        if (diffInMinutes > 0 && diffInMinutes < 105 && g.status === 'pending') {
          console.log(`Jogo ${g.homeTeam} x ${g.awayTeam} começou!`);
          await updateGameStatus(g.id, 'in_progress');
        }

        // Rule 2: > 105 mins => Searching (if it was in progress or pending)
        if (diffInMinutes >= 105 && (g.status === 'in_progress' || g.status === 'pending')) {
          console.log(`Jogo ${g.homeTeam} x ${g.awayTeam} chegou aos 105 minutos. Iniciando busca...`);
          await updateGameStatus(g.id, 'searching');
          
          // Trigger AI Search
          const aiResult = await fetchGameResultWithAI(g.homeTeam, g.awayTeam, g.date);
          if (aiResult.found && aiResult.homeScore !== undefined && aiResult.awayScore !== undefined) {
            await updateGameResult(g.id, aiResult.homeScore, aiResult.awayScore);
          } else {
            // Se falhou, volta pra searching para tentar de novo no próximo ciclo
            // Ou muda para 'verifying' (Verificando)
            await updateGameStatus(g.id, 'verifying');
          }
        }
        
        // Rule 3: Re-try AI search if stuck in verifying and time is still passing
        if (diffInMinutes >= 105 && g.status === 'verifying') {
          const aiResult = await fetchGameResultWithAI(g.homeTeam, g.awayTeam, g.date);
          if (aiResult.found && aiResult.homeScore !== undefined && aiResult.awayScore !== undefined) {
            await updateGameResult(g.id, aiResult.homeScore, aiResult.awayScore);
          }
        }
      }
    };

    const intervalId = setInterval(checkAutomations, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(intervalId);
  }, [auth, games, updateGameStatus, updateGameResult]);

  // --- /AUTOMATION LOOP ---

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'rancho2025') {
      setAuth(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleAddGame = async (e) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam || !gameDate || !gameTime) return;
    await addGame(homeTeam, awayTeam, gameDate, gameTime);
    setHomeTeam('');
    setAwayTeam('');
    setGameDate('');
    setGameTime('');
  };

  const handleSaveResult = async (gameId) => {
    const res = results[gameId];
    if (!res || res.home === undefined || res.away === undefined) return;
    await updateGameResult(gameId, res.home, res.away);
  };

  const handleAiFetch = async () => {
    for (const g of games) {
      if (g.status === 'pending' || g.status === 'in_progress' || g.status === 'searching' || g.status === 'verifying') {
        const aiResult = await fetchGameResultWithAI(g.homeTeam, g.awayTeam, g.date);
        if (aiResult.found && aiResult.homeScore !== undefined && aiResult.awayScore !== undefined) {
          await updateGameResult(g.id, aiResult.homeScore, aiResult.awayScore);
        } else {
          alert(`IA não encontrou o resultado para ${g.homeTeam} x ${g.awayTeam} ainda.`);
        }
      }
    }
  };

  const handleNewWeek = async () => {
    if (window.confirm("Certeza? Isso mudará a semana atual e a tabela recomeçará do zero nesta nova semana.")) {
      await startNewWeek();
    }
  };

  if (!auth) {
    return (
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="text-center mb-4 flex justify-center items-center gap-2">
          <ShieldAlert className="text-danger" /> Área do Admin
        </h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }}>Entrar</button>
        </form>
      </div>
    );
  }

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="grid gap-6">
      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4">
          <h2>Gerenciar Semana {currentWeek}</h2>
          <button onClick={handleNewWeek} className="btn btn-danger btn-sm"><RefreshCw size={16}/> Iniciar Nova Semana</button>
        </div>

        <form onSubmit={handleAddGame} className="flex flex-col gap-2 mb-4">
          <div className="grid grid-cols-4 gap-2">
            <input 
              className="form-input" 
              placeholder="Mandante (Ex: Flamengo)" 
              value={homeTeam} 
              onChange={e => setHomeTeam(e.target.value)} 
            />
            <input 
              className="form-input" 
              placeholder="Visitante (Ex: Vasco)" 
              value={awayTeam} 
              onChange={e => setAwayTeam(e.target.value)} 
            />
            <input 
              className="form-input" 
              type="date"
              value={gameDate} 
              onChange={e => setGameDate(e.target.value)} 
            />
            <input 
              className="form-input" 
              type="time"
              value={gameTime} 
              onChange={e => setGameTime(e.target.value)} 
            />
          </div>
          <button type="submit" className="btn btn-gold"><Plus size={16}/> Adicionar Jogo</button>
        </form>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4">
          <h2>Jogos da Semana</h2>
          <button onClick={handleAiFetch} className="btn btn-sm" style={{ backgroundColor: '#4f46e5' }}>
            <Bot size={16}/> Forçar Busca (IA)
          </button>
        </div>

        {games.length === 0 ? <p className="text-text-muted">Nenhum jogo cadastrado.</p> : null}

        {games.map(g => {
          let statusText = 'AGUARDANDO';
          let statusClass = 'text-text-muted';
          if (g.status === 'in_progress') { statusText = 'EM ANDAMENTO'; statusClass = 'text-success'; }
          if (g.status === 'searching') { statusText = 'BUSCANDO RESULTADO...'; statusClass = 'text-gold'; }
          if (g.status === 'verifying') { statusText = 'VERIFICANDO...'; statusClass = 'text-gold'; }
          if (g.status === 'finished') { statusText = 'ENCERRADO'; statusClass = 'text-success'; }

          return (
            <div key={g.id} className="match-card">
              <div className="match-header">
                <span>{g.date} {g.time && `- ${g.time}`}</span>
                <span className={statusClass}>
                  {statusText}
                </span>
              </div>
              <div className="match-teams">
                <div className="team home">{g.homeTeam}</div>
                
                {g.status !== 'finished' ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      className="form-input score-input" 
                      value={results[g.id]?.home ?? ''}
                      onChange={e => setResults({...results, [g.id]: {...results[g.id], home: e.target.value}})}
                    />
                    <span className="score-divider">X</span>
                    <input 
                      type="number" 
                      className="form-input score-input" 
                      value={results[g.id]?.away ?? ''}
                      onChange={e => setResults({...results, [g.id]: {...results[g.id], away: e.target.value}})}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="form-input score-input">{g.homeScore}</div>
                    <span className="score-divider">X</span>
                    <div className="form-input score-input">{g.awayScore}</div>
                  </div>
                )}

                <div className="team away">{g.awayTeam}</div>
              </div>
              
              <div className="flex justify-between mt-4">
                <button onClick={() => removeGame(g.id)} className="btn btn-danger btn-sm">
                  <Trash2 size={16}/> Remover
                </button>
                {g.status !== 'finished' && (
                  <button onClick={() => handleSaveResult(g.id)} className="btn btn-sm text-gold">
                    Salvar Manual
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
