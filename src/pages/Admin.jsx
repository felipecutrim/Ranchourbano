import React, { useState, useEffect } from 'react';
import { useBolaoData } from '../hooks/useBolaoData';
import { ShieldAlert, Plus, Trash2, Bot, RefreshCw, Download } from 'lucide-react';
import { fetchGameResultWithAI, fetchFixturesWithAI } from '../utils/ai';

const LEAGUES = [
  "Brasileirão Série A",
  "Brasileirão Série B",
  "Brasileirão Série C",
  "Copa do Brasil",
  "Copa do Mundo",
  "Libertadores"
];
export default function Admin() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  
  const { currentWeek, games, addGame, removeGame, updateGameStatus, updateGameDetails, updateGameResult, updateLiveScore, startNewWeek, loading } = useBolaoData();

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ homeScore: '', awayScore: '', status: '', date: '', time: '' });

  // States for API Import
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [importLeague, setImportLeague] = useState(LEAGUES[0]);
  const [importedGames, setImportedGames] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // Automação removida a pedido do usuário. Tudo agora é manual.

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

  const handleEditClick = (g) => {
    setEditingId(g.id);
    setEditForm({
      homeScore: g.homeScore ?? '',
      awayScore: g.awayScore ?? '',
      status: g.status,
      date: g.date || '',
      time: g.time || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updates = {
      status: editForm.status,
      date: editForm.date,
      time: editForm.time
    };
    if (editForm.homeScore !== '') updates.homeScore = Number(editForm.homeScore);
    if (editForm.awayScore !== '') updates.awayScore = Number(editForm.awayScore);
    
    await updateGameDetails(editingId, updates);
    setEditingId(null);
  };

  const handleFetchSingleAI = async (g) => {
    alert("Buscando placar atualizado com o Gemini...");
    const aiResult = await fetchGameResultWithAI(g.homeTeam, g.awayTeam, g.date);
    if (aiResult.found && aiResult.homeScore !== undefined && aiResult.awayScore !== undefined) {
      setEditForm(prev => ({
        ...prev,
        homeScore: aiResult.homeScore,
        awayScore: aiResult.awayScore
      }));
      alert(`O Gemini encontrou: ${aiResult.homeScore} x ${aiResult.awayScore}. Clique em Salvar para confirmar.`);
    } else {
      alert(`O Gemini não conseguiu encontrar o resultado exato agora. Verifique manualmente.`);
    }
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

  const handleFetchApi = async (e) => {
    e.preventDefault();
    setIsImporting(true);
    try {
      const data = await fetchFixturesWithAI(importDate, importLeague);
      
      // Since AI doesn't generate unique IDs like an API, we inject a temporary id for the UI list
      const gamesWithId = data.map((g, idx) => ({ ...g, id: `ai-${Date.now()}-${idx}` }));
      
      setImportedGames(gamesWithId);
      if (data.length === 0) {
        alert("Nenhum jogo encontrado para esta data e liga.");
      }
    } catch (err) {
      alert("Erro ao buscar jogos: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddImportedGame = async (g) => {
    await addGame(g.homeTeam, g.awayTeam, g.date, g.time);
    // Remove from imported list after adding
    setImportedGames(importedGames.filter(ig => ig.id !== g.id));
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
      {/* SEÇÃO IMPORTAR IA */}
      <div className="glass-panel" style={{ borderColor: 'var(--color-primary)' }}>
        <h2 className="mb-4 flex items-center gap-2 text-primary">
          <Download size={24} /> Buscar Jogos com Inteligência Artificial
        </h2>
        <form onSubmit={handleFetchApi} className="flex flex-col gap-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Campeonato</label>
              <select 
                className="form-input" 
                value={importLeague} 
                onChange={e => setImportLeague(e.target.value)}
              >
                {LEAGUES.map((l, idx) => (
                  <option key={idx} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Data dos Jogos</label>
              <input 
                type="date" 
                className="form-input" 
                value={importDate}
                onChange={e => setImportDate(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn" disabled={isImporting} style={{ backgroundColor: '#1e40af' }}>
            {isImporting ? 'Buscando...' : 'Buscar Jogos'}
          </button>
        </form>

        {importedGames.length > 0 && (
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <h3 className="mb-2 text-gold">Resultados da Busca</h3>
            <div className="grid gap-2">
              {importedGames.map(g => (
                <div key={g.id} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <div>
                    <strong className="text-text">{g.time}</strong> - {g.homeTeam} x {g.awayTeam}
                  </div>
                  <button onClick={() => handleAddImportedGame(g)} className="btn btn-sm btn-gold">
                    <Plus size={16}/> Adicionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4">
          <h2>Adicionar Jogo Manualmente (Semana {currentWeek})</h2>
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
          if (g.status === 'searching' || g.status === 'verifying') { statusText = 'VERIFICANDO...'; statusClass = 'text-gold'; }
          if (g.status === 'finished') { statusText = 'ENCERRADO'; statusClass = 'text-success'; }

          if (editingId === g.id) {
            return (
              <div key={g.id} className="match-card" style={{ border: '1px solid var(--color-gold)' }}>
                <div className="mb-2 text-gold text-center"><strong>Editando: {g.homeTeam} x {g.awayTeam}</strong></div>
                
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="form-group mb-0">
                    <label style={{ fontSize: '0.8rem' }}>Data</label>
                    <input type="date" className="form-input" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                  </div>
                  <div className="form-group mb-0">
                    <label style={{ fontSize: '0.8rem' }}>Hora</label>
                    <input type="time" className="form-input" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} />
                  </div>
                </div>

                <div className="form-group mb-2">
                  <label style={{ fontSize: '0.8rem' }}>Status</label>
                  <select className="form-input" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    <option value="pending">Pendente (Aberto)</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="finished">Encerrado</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 mb-4 justify-center">
                  <div className="text-center">
                    <label style={{ fontSize: '0.8rem' }}>{g.homeTeam}</label>
                    <input type="number" className="form-input score-input" value={editForm.homeScore} onChange={e => setEditForm({...editForm, homeScore: e.target.value})} />
                  </div>
                  <span className="score-divider mt-4">X</span>
                  <div className="text-center">
                    <label style={{ fontSize: '0.8rem' }}>{g.awayTeam}</label>
                    <input type="number" className="form-input score-input" value={editForm.awayScore} onChange={e => setEditForm({...editForm, awayScore: e.target.value})} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleFetchSingleAI(g)} className="btn btn-sm" style={{ backgroundColor: '#4f46e5' }}>
                    <Bot size={16}/> Preencher Placar com Gemini
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="btn btn-sm" style={{ flex: 1 }}>Cancelar</button>
                    <button onClick={handleSaveEdit} className="btn btn-gold btn-sm" style={{ flex: 1 }}>Salvar Alterações</button>
                  </div>
                </div>
              </div>
            );
          }

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
                <div className="flex items-center gap-2">
                  <div className="form-input score-input" style={{ backgroundColor: 'transparent', border: 'none' }}>{g.homeScore ?? '-'}</div>
                  <span className="score-divider">X</span>
                  <div className="form-input score-input" style={{ backgroundColor: 'transparent', border: 'none' }}>{g.awayScore ?? '-'}</div>
                </div>
                <div className="team away">{g.awayTeam}</div>
              </div>
              
              <div className="flex justify-between mt-4">
                <button onClick={() => removeGame(g.id)} className="btn btn-danger btn-sm">
                  <Trash2 size={16}/> Remover
                </button>
                <button onClick={() => handleEditClick(g)} className="btn btn-sm text-gold">
                  Editar Jogo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
