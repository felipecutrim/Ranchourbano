import React, { useState, useEffect, useMemo } from 'react';
import { useBolaoData } from '../hooks/useBolaoData';
import { Users, Save } from 'lucide-react';

const FRASES_BOLEIRO = [
  "O jogo só acaba quando termina, sô!",
  "Futebol é uma caixinha de surpresas.",
  "Clássico é clássico e vice-versa.",
  "A bola pune, meu cumpade.",
  "Quem não faz, toma!",
  "Treino é treino, jogo é jogo.",
  "Se a bola não entrar, não é gol.",
  "Haja coração, amigo!",
  "O professor pediu pra fechar a casinha."
];

export default function Participant() {
  const { currentWeek, games, participants, submitGuesses, loading } = useBolaoData();
  const [name, setName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  
  // Frases mapeadas por jogo para não mudar a cada re-render
  const frases = useMemo(() => {
    const map = {};
    games.forEach((g, idx) => {
      map[g.id] = FRASES_BOLEIRO[idx % FRASES_BOLEIRO.length];
    });
    return map;
  }, [games]);

  // Local state for guesses before submitting
  const [guesses, setGuesses] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-load guesses if returning user
  useEffect(() => {
    if (loggedIn && name) {
      const p = participants.find(part => part.name.toLowerCase() === name.toLowerCase());
      if (p && p.guesses) {
        setGuesses(p.guesses);
      }
    }
  }, [loggedIn, name, participants]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Check if limit reached and not already in
    const p = participants.find(part => part.name.toLowerCase() === name.trim().toLowerCase());
    if (!p && participants.length >= 14) {
      setErrorMsg("O bolão desta semana já atingiu o limite de 14 participantes!");
      return;
    }
    
    setName(name.trim());
    setLoggedIn(true);
    setErrorMsg('');
  };

  const handleSave = async () => {
    try {
      await submitGuesses(name, guesses);
      alert("Palpites salvos com sucesso!");
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  if (!loggedIn) {
    return (
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="text-center mb-4 flex justify-center items-center gap-2">
          <Users className="text-gold" /> Entrar no Bolão
        </h2>
        {errorMsg && <div className="text-danger mb-4 text-center">{errorMsg}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Seu Nome</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Digite seu nome..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>Entrar na Rodada</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel">
      <div className="flex justify-between items-center mb-4">
        <h2>Seus Palpites, <span className="text-gold">{name}</span></h2>
        <button onClick={handleSave} className="btn btn-gold btn-sm"><Save size={16}/> Salvar Palpites</button>
      </div>
      
      {errorMsg && <div className="text-danger mb-4 text-center">{errorMsg}</div>}

      {games.length === 0 ? <p className="text-text-muted">Nenhum jogo cadastrado para esta semana.</p> : null}

      <div className="grid gap-4 mt-6">
        {games.map(g => {
          const isPending = g.status === 'pending';
          
          let statusText = 'ABERTO PARA PALPITE';
          let statusClass = 'text-gold';
          if (g.status === 'in_progress') { statusText = 'JOGO EM ANDAMENTO'; statusClass = 'text-success'; }
          if (g.status === 'searching') { statusText = 'BUSCANDO RESULTADO...'; statusClass = 'text-gold'; }
          if (g.status === 'verifying') { statusText = 'VERIFICANDO...'; statusClass = 'text-gold'; }
          if (g.status === 'finished') { statusText = 'ENCERRADO'; statusClass = 'text-danger'; }

          return (
            <div key={g.id} className="match-card">
              <div className="match-header">
                <span>{g.date} {g.time && `- ${g.time}`}</span>
                <span className={statusClass}>{statusText}</span>
              </div>
              
              <div className="match-teams">
                <div className="team home">{g.homeTeam}</div>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    className="form-input score-input" 
                    value={guesses[g.id]?.home ?? ''}
                    disabled={!isPending}
                    onChange={e => setGuesses({...guesses, [g.id]: {...guesses[g.id], home: e.target.value}})}
                  />
                  <span className="score-divider">X</span>
                  <input 
                    type="number" 
                    className="form-input score-input" 
                    value={guesses[g.id]?.away ?? ''}
                    disabled={!isPending}
                    onChange={e => setGuesses({...guesses, [g.id]: {...guesses[g.id], away: e.target.value}})}
                  />
                </div>

                <div className="team away">{g.awayTeam}</div>
              </div>

              {isPending && (
                <div className="mt-4 text-center text-text-muted" style={{fontStyle: 'italic', fontSize: '0.85rem'}}>
                  "{frases[g.id]}"
                </div>
              )}

              {!isPending && (
                <div className="mt-4 text-center text-text-muted" style={{fontSize: '0.875rem'}}>
                  Resultado Real: {g.homeScore} x {g.awayScore}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {games.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} className="btn btn-gold"><Save size={20}/> Salvar Palpites</button>
        </div>
      )}
    </div>
  );
}
