import React, { useState } from 'react';
import { useBolaoData } from '../hooks/useBolaoData';
import { Trophy, X } from 'lucide-react';

export default function Home() {
  const { currentWeek, participants, games, loading } = useBolaoData();
  const [selectedParticipant, setSelectedParticipant] = useState(null);

  if (loading) return <div className="text-center mt-8">Carregando...</div>;

  const formatDate = (isoString) => {
    if (!isoString) return 'Data desconhecida';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', 
      hour: '2-digit', minute:'2-digit'
    });
  };

  return (
    <div className="glass-panel">
      <div className="flex justify-between items-center mb-4">
        <h2>Classificação da Semana <span className="week-badge">{currentWeek}</span></h2>
        <div className="text-text-muted">{games.length} Jogos na rodada</div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th width="60">Pos</th>
              <th>Nome</th>
              <th className="text-center">Pontos</th>
              <th className="text-center">Cravadas (3p)</th>
              <th className="text-center">Acertos (1p)</th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-text-muted py-4">Nenhum participante ainda.</td>
              </tr>
            ) : (
              participants.map((p, index) => (
                <tr key={p.id}>
                  <td>
                    <div className={`rank-badge ${index < 3 ? 'rank-' + (index + 1) : ''}`}>
                      {index + 1}
                    </div>
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedParticipant(p)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-gold)',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        textDecoration: 'underline'
                      }}
                    >
                      {p.name}
                    </button>
                    {p.lastUpdated && (
                      <div className="text-text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                        Atualizado em: {formatDate(p.lastUpdated)}
                      </div>
                    )}
                  </td>
                  <td className="text-center font-bold" style={{ fontSize: '1.25rem' }}>{p.totalPoints}</td>
                  <td className="text-center text-success font-bold">{p.exactHits}</td>
                  <td className="text-center text-gold font-bold">{p.resultHits}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-center text-text-muted" style={{ fontSize: '0.875rem' }}>
        <p>Regras: Placar Exato = 3 pontos | Acertar o Vencedor/Empate = 1 ponto</p>
      </div>

      {/* Modal de Palpites do Participante */}
      {selectedParticipant && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-gold">Palpites de {selectedParticipant.name}</h2>
              <button onClick={() => setSelectedParticipant(null)} className="btn btn-danger btn-sm" style={{ padding: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>
            
            {selectedParticipant.lastUpdated && (
              <p className="text-text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                Última modificação: {formatDate(selectedParticipant.lastUpdated)}
              </p>
            )}

            <div className="grid gap-4">
              {games.map(g => {
                const guess = selectedParticipant.guesses?.[g.id];
                const hasGuess = guess && guess.home !== undefined && guess.away !== undefined;
                
                return (
                  <div key={g.id} className="match-card">
                    <div className="match-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{g.date} {g.time && `- ${g.time}`}</span>
                      <span className={g.status === 'finished' ? 'text-success' : 'text-gold'}>
                        {g.status === 'finished' ? 'ENCERRADO' : 'EM ABERTO'}
                      </span>
                    </div>
                    
                    <div className="match-teams mb-2">
                      <div className="team home">{g.homeTeam}</div>
                      <div className="flex items-center gap-2">
                        <div className="form-input score-input" style={{ padding: '0.25rem', height: 'auto', backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
                          {hasGuess ? guess.home : '-'}
                        </div>
                        <span className="score-divider">X</span>
                        <div className="form-input score-input" style={{ padding: '0.25rem', height: 'auto', backgroundColor: 'rgba(212, 175, 55, 0.1)' }}>
                          {hasGuess ? guess.away : '-'}
                        </div>
                      </div>
                      <div className="team away">{g.awayTeam}</div>
                    </div>
                    
                    {g.status === 'finished' && (
                      <div className="text-center" style={{ fontSize: '0.875rem' }}>
                        Resultado Real: <strong className="text-success">{g.homeScore} x {g.awayScore}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
