import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PagamentoInfo from '../components/PagamentoInfo';
import type { Pagamento, Reserva } from '../types';
import { dataBR, hojeISO, icone, mascaraTelefone, moeda, STATUS_LABEL, STATUS_PAGAMENTO_LABEL } from '../utils';

const TELEFONE_KEY = 'agenda_telefone';

export default function MinhasReservas() {
  const [telefone, setTelefone] = useState(() => {
    try { return mascaraTelefone(localStorage.getItem(TELEFONE_KEY) ?? ''); } catch { return ''; }
  });
  const [reservas, setReservas] = useState<Reserva[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);

  const abrirPagamento = async (r: Reserva) => {
    try {
      setPagamento(await api.pagamento(r.id, telefone));
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  const buscar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (telefone.replace(/\D/g, '').length < 10) {
      setErro('Informe o telefone com DDD.');
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      setReservas(await api.minhasReservas(telefone));
      try { localStorage.setItem(TELEFONE_KEY, telefone.replace(/\D/g, '')); } catch { /* ignora */ }
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (telefone.replace(/\D/g, '').length >= 10) buscar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cancelar = async (r: Reserva) => {
    if (!window.confirm(`Cancelar a reserva #${r.id} de ${dataBR(r.data)} às ${r.horaInicio}?`)) return;
    try {
      const atualizada = await api.cancelarMinha(r.id, telefone);
      setReservas((lista) => lista?.map((x) => (x.id === r.id ? atualizada : x)) ?? null);
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  const hoje = hojeISO();
  const proximas = reservas?.filter((r) => r.data >= hoje && r.status === 'CONFIRMADA') ?? [];
  const historico = reservas?.filter((r) => !(r.data >= hoje && r.status === 'CONFIRMADA')) ?? [];

  return (
    <div>
      <h1>Minhas reservas</h1>
      <form className="card linha-filtros" onSubmit={buscar}>
        <label className="flex-1">
          Telefone usado na reserva
          <input
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
            placeholder="(81) 99999-8888"
            inputMode="tel"
          />
        </label>
        <button className="btn btn-primario" disabled={carregando}>{carregando ? 'Buscando…' : 'Buscar'}</button>
      </form>

      {erro && <div className="alerta erro">{erro}</div>}

      {reservas && reservas.length === 0 && (
        <div className="card vazio">
          <p>Nenhuma reserva encontrada para esse telefone.</p>
          <Link to="/reservar" className="btn btn-primario">Fazer uma reserva</Link>
        </div>
      )}

      {proximas.length > 0 && (
        <>
          <h2>Próximas</h2>
          <div className="lista-reservas">
            {proximas.map((r) => (
              <CardReserva key={r.id} r={r} onCancelar={() => cancelar(r)} onPagar={() => abrirPagamento(r)} />
            ))}
          </div>
        </>
      )}

      {historico.length > 0 && (
        <>
          <h2>Histórico</h2>
          <div className="lista-reservas">
            {historico.map((r) => <CardReserva key={r.id} r={r} />)}
          </div>
        </>
      )}

      {pagamento && (
        <div className="modal-fundo" onClick={() => setPagamento(null)}>
          <div className="modal modal-largo" onClick={(e) => e.stopPropagation()}>
            <div className="modal-topo">
              <h2>Pagamento da reserva #{pagamento.reservaId}</h2>
              <button className="btn btn-link" onClick={() => setPagamento(null)}>✕</button>
            </div>
            <PagamentoInfo p={pagamento} />
          </div>
        </div>
      )}
    </div>
  );
}

function CardReserva({ r, onCancelar, onPagar }: { r: Reserva; onCancelar?: () => void; onPagar?: () => void }) {
  return (
    <div className={`card reserva-card status-${r.status.toLowerCase()}`}>
      <div className="reserva-topo">
        <span className="reserva-esporte">{icone(r.esporteIcone)} {r.esporteNome}</span>
        <span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
      </div>
      <h3>{dataBR(r.data)} · {r.horaInicio}–{r.horaFim}</h3>
      <p className="muted">{r.quadraNome} · reserva #{r.id}</p>
      {r.itens.length > 0 && (
        <p className="itens">{r.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ')}</p>
      )}
      {r.status !== 'CANCELADA' && (
        <p className="pequeno">
          <span className={`badge pg-${r.statusPagamento.toLowerCase()}`}>{STATUS_PAGAMENTO_LABEL[r.statusPagamento]}</span>{' '}
          {r.valorPago > 0 && <span className="muted">pago {moeda(r.valorPago)}</span>}
        </p>
      )}
      <div className="reserva-rodape">
        <strong>{moeda(r.valorTotal)}</strong>
        <div className="botoes">
          {onPagar && r.statusPagamento !== 'PAGO' && (
            <button className="btn btn-primario btn-pequeno" onClick={onPagar}>Pagar</button>
          )}
          {onCancelar && <button className="btn btn-perigo btn-pequeno" onClick={onCancelar}>Cancelar</button>}
        </div>
      </div>
    </div>
  );
}
