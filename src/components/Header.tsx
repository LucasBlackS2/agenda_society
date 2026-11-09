import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="topo">
      <div className="container topo-inner">
        <NavLink to="/" className="logo">
          <span className="logo-icone">🏖️</span> Arena Society
        </NavLink>
        <nav className="menu">
          <NavLink to="/reservar">Reservar</NavLink>
          <NavLink to="/minhas-reservas">Minhas reservas</NavLink>
          <NavLink to="/admin">Administração</NavLink>
        </nav>
      </div>
    </header>
  );
}
