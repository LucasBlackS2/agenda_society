import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1>Reserve sua quadra em poucos cliques</h1>
        <p>
          2 quadras de areia e 1 campo society. Escolha o esporte, o horário e já separe
          as bolas, raquetes e coletes que vai precisar.
        </p>
        <div className="hero-acoes">
          <Link to="/reservar" className="btn btn-primario btn-grande">Quero reservar</Link>
          <Link to="/minhas-reservas" className="btn btn-secundario btn-grande">Ver minhas reservas</Link>
        </div>
      </section>

      <section className="cards-quadras">
        <div className="card-info areia">
          <span className="emoji">🏐</span>
          <h3>Quadras de areia (2)</h3>
          <p>Vôlei de praia, beach tennis, futevôlei e futebol de areia.</p>
        </div>
        <div className="card-info society">
          <span className="emoji">⚽</span>
          <h3>Campo society (1)</h3>
          <p>Grama sintética para o seu fut com a galera.</p>
        </div>
        <div className="card-info equip">
          <span className="emoji">🎾</span>
          <h3>Aluguel de equipamentos</h3>
          <p>Bolas, raquetes de beach tennis e kits de coletes direto na reserva.</p>
        </div>
      </section>
    </div>
  );
}
