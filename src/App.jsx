import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Trophy, Shield, Users } from 'lucide-react';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Participant from './pages/Participant';

function App() {
  return (
    <Router>
      <div className="container">
        <header className="header">
          <h1>🤠 Bet do Mineiro 🌾</h1>
          <p className="text-text-muted">Bolão de Futebol Raiz 🚬</p>
        </header>

        <nav className="navbar">
          <Link to="/" className="btn btn-sm"><Trophy size={16}/> Classificação</Link>
          <Link to="/participant" className="btn btn-sm btn-gold"><Users size={16}/> Dar Palpite</Link>
          <Link to="/admin" className="btn btn-sm" style={{backgroundColor: 'var(--color-panel)'}}><Shield size={16}/> Admin</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/participant" element={<Participant />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
