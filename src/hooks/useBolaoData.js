import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, where, setDoc, updateDoc, getDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

export function useBolaoData() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [games, setGames] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load current week
  useEffect(() => {
    if(!db) return;
    const unsub = onSnapshot(doc(db, 'config', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentWeek(docSnap.data().currentWeek || 1);
      } else {
        // Init config
        setDoc(doc(db, 'config', 'current'), { currentWeek: 1 });
      }
    });
    return () => unsub();
  }, []);

  // Load games for current week
  useEffect(() => {
    if(!db || !currentWeek) return;
    const q = query(collection(db, 'games'), where('week', '==', currentWeek));
    const unsub = onSnapshot(q, (snapshot) => {
      const g = [];
      snapshot.forEach(doc => g.push({ id: doc.id, ...doc.data() }));
      // Sort by date (simple sort for now)
      setGames(g);
    });
    return () => unsub();
  }, [currentWeek]);

  // Load participants for current week
  useEffect(() => {
    if(!db || !currentWeek) return;
    const q = query(collection(db, 'participants'), where('week', '==', currentWeek));
    const unsub = onSnapshot(q, (snapshot) => {
      const p = [];
      snapshot.forEach(doc => p.push({ id: doc.id, ...doc.data() }));
      
      // Calculate ranks
      p.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
        return b.resultHits - a.resultHits;
      });
      
      setParticipants(p);
      setLoading(false);
    });
    return () => unsub();
  }, [currentWeek]);

  // Admin Actions
  const addGame = async (homeTeam, awayTeam, date, time) => {
    const newDoc = doc(collection(db, 'games'));
    await setDoc(newDoc, {
      week: currentWeek,
      homeTeam,
      awayTeam,
      date,
      time: time || '00:00',
      status: 'pending',
      homeScore: null,
      awayScore: null
    });
  };

  const removeGame = async (gameId) => {
    await deleteDoc(doc(db, 'games', gameId));
  };

  const updateGameStatus = async (gameId, newStatus) => {
    await updateDoc(doc(db, 'games', gameId), {
      status: newStatus
    });
  };

  const updateLiveScore = async (gameId, homeScore, awayScore) => {
    await updateDoc(doc(db, 'games', gameId), {
      homeScore: Number(homeScore),
      awayScore: Number(awayScore)
    });
  };

  const updateGameResult = async (gameId, homeScore, awayScore) => {
    await updateDoc(doc(db, 'games', gameId), {
      status: 'finished',
      homeScore: Number(homeScore),
      awayScore: Number(awayScore)
    });
    // Triggers cloud function or client-side calc
    // Since we don't have cloud functions, let's calc client side here
    await recalculatePoints(currentWeek, gameId, Number(homeScore), Number(awayScore));
  };

  // Calculates points for all participants for the given game
  const recalculatePoints = async (week, gameId, realHome, realAway) => {
    const pSnapshot = await getDocs(query(collection(db, 'participants'), where('week', '==', week)));
    const batch = writeBatch(db);

    pSnapshot.forEach(pDoc => {
      const p = pDoc.data();
      if (!p.guesses || !p.guesses[gameId]) return;
      
      const guess = p.guesses[gameId];
      let points = 0;
      let exact = 0;
      let result = 0;

      const guessHome = Number(guess.home);
      const guessAway = Number(guess.away);

      if (guessHome === realHome && guessAway === realAway) {
        points = 3;
        exact = 1;
      } else {
        const realDiff = realHome - realAway;
        const guessDiff = guessHome - guessAway;
        
        if ((realDiff > 0 && guessDiff > 0) || (realDiff < 0 && guessDiff < 0) || (realDiff === 0 && guessDiff === 0)) {
          points = 1;
          result = 1;
        }
      }

      // Update participant total (simplification: recalculate from scratch to be safe)
      // Actually we must calc all games to be accurate if a result changes
    });
    await batch.commit();
    // To be perfectly accurate, let's just trigger a full recalc
    await fullRecalculate(week);
  };

  const fullRecalculate = async (week) => {
    const gSnapshot = await getDocs(query(collection(db, 'games'), where('week', '==', week)));
    const pSnapshot = await getDocs(query(collection(db, 'participants'), where('week', '==', week)));
    
    const allGames = [];
    gSnapshot.forEach(d => allGames.push({id: d.id, ...d.data()}));
    
    const batch = writeBatch(db);

    pSnapshot.forEach(pDoc => {
      const p = pDoc.data();
      let totalPoints = 0;
      let exactHits = 0;
      let resultHits = 0;

      allGames.forEach(g => {
        if (g.status === 'finished' && p.guesses && p.guesses[g.id]) {
          const guess = p.guesses[g.id];
          const guessHome = Number(guess.home);
          const guessAway = Number(guess.away);
          const realHome = Number(g.homeScore);
          const realAway = Number(g.awayScore);

          if (guessHome === realHome && guessAway === realAway) {
            totalPoints += 3;
            exactHits += 1;
          } else {
            const realDiff = realHome - realAway;
            const guessDiff = guessHome - guessAway;
            if ((realDiff > 0 && guessDiff > 0) || (realDiff < 0 && guessDiff < 0) || (realDiff === 0 && guessDiff === 0)) {
              totalPoints += 1;
              resultHits += 1;
            }
          }
        }
      });

      batch.update(pDoc.ref, { totalPoints, exactHits, resultHits });
    });

    await batch.commit();
  };

  const startNewWeek = async () => {
    await setDoc(doc(db, 'config', 'current'), { currentWeek: currentWeek + 1 });
  };

  // Participant Actions
  const submitGuesses = async (name, guesses) => {
    // check if participant exists in this week
    const q = query(collection(db, 'participants'), where('week', '==', currentWeek), where('name', '==', name));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Check limit
      const allP = await getDocs(query(collection(db, 'participants'), where('week', '==', currentWeek)));
      if (allP.size >= 14) {
        throw new Error("Limite de 14 participantes atingido.");
      }
      // Create new
      await setDoc(doc(collection(db, 'participants')), {
        week: currentWeek,
        name,
        guesses,
        lastUpdated: new Date().toISOString(),
        totalPoints: 0,
        exactHits: 0,
        resultHits: 0
      });
    } else {
      // Update
      const pDoc = snapshot.docs[0];
      await updateDoc(pDoc.ref, { 
        guesses,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Recalc points for this user if there are finished games
    await fullRecalculate(currentWeek);
  };

  return {
    currentWeek,
    games,
    participants,
    loading,
    addGame,
    removeGame,
    updateGameResult,
    updateGameStatus,
    updateLiveScore,
    startNewWeek,
    submitGuesses
  };
}
