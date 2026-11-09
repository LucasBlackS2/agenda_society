import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, auth } from '../api';
import AdminConfig from './AdminConfig';
import type { Config, Quadra, Reserva, Resumo, StatusReserva } from '../types';
import {
  cor, dataBR, hojeISO, horaNumero, icone, moeda, somarDias, STATUS_LABEL, STATUS_PAGAMENTO_LABEL, telefoneBR,
} from '../utils';

type Aba = 'grade' | 'lista' | 'config';

export default function AdminPainel() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config>({
    horaAbertura: 8, horaFechamento: 23, duracaoMaximaHoras: 4, percentualMinimo: 50, pixAtivo: false, contaAtiva: false,
  });
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [data, setData] = useState(hojeISO());
  const [aba, setAba] = useState<Aba>('grade');

  const [reservasDia, setReservasDia] = useState<Reserva[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Reserva | null>(null);

  // filtros da lista
  const [periodo, setPeriodo] = useState(0); // dias além da data selecionada
  const [filtroQuadra, setFiltroQuadra] = useState<number | ''>('');
  const [filtroStatus, setFiltroStatus] = useState<StatusReserva | ''>('');
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<Reserva[]>([]);

  const tratarErro = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      navigate('/admin/login', { replace: true });
      return;
    }
    setErro((e as Error).message);
  }, [navigate]);

  const carregarBase = useCallback(() => {
    Promise.all([api.config(), api.quadras()])
      .then(([c, q]) => { setConfig(c); setQuadras(q); })
      .catch(tratarErro);
  }, [tratarErro]);

  useEffect(() => { carregarBase(); }, [carregarBase]);

  const carregarDia = useCallback(() => {
    Promise.all([api.reservasAdmin(data), api.resumo(data)])
      .then(([r, s]) => { setReservasDia(r); setResumo(s); })
      .catch(tratarErro);
  }, [data, tratarErro]);

  const carregarLista = useCallback(() => {
    api.reservasAdmin(data, somarDias(data, periodo), filtroQuadra || undefined, filtroStatus || undefined)
      .then(setLista)
      .catch(tratarErro);
  }, [data, periodo, filtroQuadra, filtroStatus, tratarErro]);

  useEffect(() => { carregarDia(); }, [carregarDia]);
  useEffect(() => { if (aba === 'lista') carregarLista(); }, [aba, carregarLista]);

  const recarregar = () => { carregarDia(); if (aba === 'lista') carregarLista(); };

  const sair = async () => {
    try { await api.logout(); } catch { /* ignora */ }
    auth.sair();
    navigate('/admin/login', { replace: true });
  };

  const registrarPagamento = async (r: Reserva, valor: number) => {
    if (Number.isNaN(valor) || valor < 0 || valor > r.valorTotal) {
      setErro('Valor inválido.');
      return;
    }
    try {
      const atualizada = await api.atualizarPagamento(r.id, valor);
      setSelecionada(atualizada);
      recarregar();
    } catch (e) {
      tratarErro(e);
    }
  };

  const mudarStatus = async (r: Reserva, status: StatusReserva) => {
    const textos: Record<StatusReserva, string> = {
      CANCELADA: 'cancelar esta reserva',
      CONCLUIDA: 'marcar esta reserva como concluída',
      CONFIRMADA: 'reativar esta reserva',
    };
    if (!window.confirm(`Deseja ${textos[status]}?`)) return;
    try {
      const atualizada = await api.alterarStatus(r.id, status);
      setSelecionada(atualizada);
      recarregar();
    } catch (e) {
      tratarErro(e);
    }
  };

  // ---------- grade ----------
  const horas = useMemo(
    () => Array.from({ length: config.horaFechamento - config.horaAbertura }, (_, i) => config.horaAbertura + i),
    [config],
  );
  const ativasDia = reservasDia.filter((r) => r.status !== 'CANCELADA');

  /** Reserva que ocupa a quadra naquela hora (se houver). */
  const reservaEm = (quadraId: number, h: number) =>
    ativasDia.find((r) => r.quadraId === quadraId && horaNumero(r.horaInicio) <= h && horaNumero(r.horaFim) > h);

  const listaFiltrada = lista.filter((r) => {
    if (!busca.trim()) return true;
    const b = busca.toLowerCase();
    return r.nomeCliente.toLowerCase().includes(b) || r.telefone.includes(b.replace(/\D/g, '') || '§') || String(r.id) === b;
  });

  return (
    <div className="admin">
      <div className="admin-topo">
        <h1>Painel do administrador</h1>
        <button className="btn btn-secundario btn-pequeno" onClick={sair}>Sair</button>
      </div>

      {erro && <div className="alerta erro" onClick={() => setErro(null)}>{erro}</div>}

      {/* navegação de data */}
      <div className="card nav-data">
        <button className="btn btn-secundario" onClick={() => setData(somarDias(data, -1))}>◀</button>
        <input type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
        <button className="btn btn-secundario" onClick={() => setData(somarDias(data, 1))}>▶</button>
        <button className="btn btn-link" onClick={() => setData(hojeISO())}>Hoje</button>
        <strong className="nav-data-titulo">{dataBR(data)}</strong>
        <button className="btn btn-link" onClick={recarregar}>↻ Atualizar</button>
      </div>

      {/* resumo */}
      {resumo && (
        <div className="kpis">
          <div className="kpi"><span>Reservas</span><strong>{resumo.totalReservas}</strong>
            {resumo.canceladas > 0 && <small>{resumo.canceladas} cancelada(s)</small>}</div>
          <div className="kpi"><span>Horas ocupadas</span><strong>{resumo.horasOcupadas}h</strong></div>
          <div className="kpi"><span>Faturamento previsto</span><strong>{moeda(resumo.faturamentoPrevisto)}</strong></div>
          <div className="kpi"><span>Já recebido</span><strong className="verde">{moeda(resumo.valorRecebido)}</strong>
            <small>a receber {moeda(resumo.valorAReceber)}</small></div>
          {resumo.ocupacao.map((o) => (
            <div className="kpi" key={o.quadraId}>
              <span>{o.nome}</span>
              <strong>{o.percentual}%</strong>
              <div className="barra"><div style={{ width: `${Math.min(100, o.percentual)}%` }} /></div>
              <small>{o.horasReservadas}h de {o.horasFuncionamento}h</small>
            </div>
          ))}
        </div>
      )}

      {resumo && Object.keys(resumo.equipamentosAlugados).length > 0 && (
        <div className="card equip-dia">
          <strong>Equipamentos para separar hoje:</strong>{' '}
          {Object.entries(resumo.equipamentosAlugados).map(([nome, q]) => (
            <span className="chip" key={nome}>{q}× {nome}</span>
          ))}
        </div>
      )}

      <div className="abas">
        <button className={aba === 'grade' ? 'ativa' : ''} onClick={() => setAba('grade')}>Grade do dia</button>
        <button className={aba === 'lista' ? 'ativa' : ''} onClick={() => setAba('lista')}>Lista de reservas</button>
        <button className={aba === 'config' ? 'ativa' : ''} onClick={() => setAba('config')}>⚙️ Configurações</button>
      </div>

      {aba === 'grade' && (
        <div className="card grade-wrap">
          <table className="grade">
            <thead>
              <tr>
                <th>Horário</th>
                {quadras.map((q) => <th key={q.id}>{q.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {horas.map((h) => (
                <tr key={h}>
                  <td className="grade-hora">{String(h).padStart(2, '0')}:00</td>
                  {quadras.map((q) => {
                    const r = reservaEm(q.id, h);
                    if (!r) return <td key={q.id} className="livre">Livre</td>;
                    // só desenha a célula na primeira hora da reserva
                    if (horaNumero(r.horaInicio) !== h) return null;
                    const span = horaNumero(r.horaFim) - horaNumero(r.horaInicio);
                    return (
                      <td key={q.id} rowSpan={span} className="ocupada">
                        <button
                          className="bloco-reserva"
                          style={{ borderLeftColor: cor(r.esporteCor) }}
                          onClick={() => setSelecionada(r)}
                        >
                          <strong>{r.nomeCliente}</strong>
                          <span>{icone(r.esporteIcone)} {r.esporteNome}</span>
                          <small>{r.horaInicio}–{r.horaFim} · {telefoneBR(r.telefone)}</small>
                          <span className={`badge pg-${r.statusPagamento.toLowerCase()}`}>{STATUS_PAGAMENTO_LABEL[r.statusPagamento]}</span>
                          {r.status === 'CONCLUIDA' && <span className="badge concluida">Concluída</span>}
                          {r.itens.length > 0 && <small>🎒 {r.itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)</small>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {reservasDia.some((r) => r.status === 'CANCELADA') && (
            <p className="muted pequeno">
              Canceladas no dia: {reservasDia.filter((r) => r.status === 'CANCELADA')
                .map((r) => `${r.nomeCliente} (${r.quadraNome} ${r.horaInicio})`).join(' · ')}
            </p>
          )}
        </div>
      )}

      {aba === 'lista' && (
        <div className="card">
          <div className="linha-filtros">
            <label>
              Período
              <select value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
                <option value={0}>Somente o dia selecionado</option>
                <option value={6}>7 dias a partir da data</option>
                <option value={29}>30 dias a partir da data</option>
              </select>
            </label>
            <label>
              Quadra
              <select value={filtroQuadra} onChange={(e) => setFiltroQuadra(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Todas</option>
                {quadras.map((q) => <option key={q.id} value={q.id}>{q.nome}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusReserva | '')}>
                <option value="">Todos</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="CONCLUIDA">Concluída</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </label>
            <label className="flex-1">
              Buscar
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, telefone ou nº da reserva" />
            </label>
          </div>

          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>#</th><th>Data</th><th>Horário</th><th>Quadra</th><th>Esporte</th>
                  <th>Cliente</th><th>Telefone</th><th>Equipamentos</th><th>Total</th><th>Pagamento</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.length === 0 && (
                  <tr><td colSpan={11} className="centro muted">Nenhuma reserva encontrada.</td></tr>
                )}
                {listaFiltrada.map((r) => (
                  <tr key={r.id} onClick={() => setSelecionada(r)} className="clicavel">
                    <td>{r.id}</td>
                    <td>{dataBR(r.data)}</td>
                    <td>{r.horaInicio}–{r.horaFim}</td>
                    <td>{r.quadraNome}</td>
                    <td>{icone(r.esporteIcone)} {r.esporteNome}</td>
                    <td>{r.nomeCliente}</td>
                    <td>{telefoneBR(r.telefone)}</td>
                    <td>{r.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ') || '—'}</td>
                    <td>{moeda(r.valorTotal)}</td>
                    <td>
                      <span className={`badge pg-${r.statusPagamento.toLowerCase()}`}>{STATUS_PAGAMENTO_LABEL[r.statusPagamento]}</span>
                      {r.valorPago > 0 && r.statusPagamento !== 'PAGO' && <small className="muted"> {moeda(r.valorPago)}</small>}
                    </td>
                    <td><span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'config' && <AdminConfig onAlterado={() => { carregarBase(); carregarDia(); }} onErro={tratarErro} />}

      {selecionada && (
        <DetalheReserva
          r={selecionada}
          onFechar={() => setSelecionada(null)}
          onStatus={mudarStatus}
          onPagamento={registrarPagamento}
        />
      )}
    </div>
  );
}

function DetalheReserva({ r, onFechar, onStatus, onPagamento }: {
  r: Reserva;
  onFechar: () => void;
  onStatus: (r: Reserva, s: StatusReserva) => void;
  onPagamento: (r: Reserva, valor: number) => void;
}) {
  const [valorManual, setValorManual] = useState(String(r.valorPago));
  useEffect(() => { setValorManual(String(r.valorPago)); }, [r]);
  const whatsapp = `https://wa.me/55${r.telefone.replace(/^55/, '')}`;
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h2>Reserva #{r.id}</h2>
          <button className="btn btn-link" onClick={onFechar}>✕</button>
        </div>
        <span className={`badge ${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
        <div className="resumo-linhas">
          <div><span>Cliente</span><strong>{r.nomeCliente}</strong></div>
          <div><span>Telefone</span><strong><a href={whatsapp} target="_blank" rel="noreferrer">{telefoneBR(r.telefone)} (WhatsApp)</a></strong></div>
          {r.email && <div><span>E-mail</span><strong>{r.email}</strong></div>}
          <div><span>Quadra</span><strong>{r.quadraNome}</strong></div>
          <div><span>Esporte</span><strong>{icone(r.esporteIcone)} {r.esporteNome}</strong></div>
          <div><span>Data</span><strong>{dataBR(r.data)}</strong></div>
          <div><span>Horário</span><strong>{r.horaInicio} às {r.horaFim}</strong></div>
          <div><span>Valor da quadra</span><strong>{moeda(r.valorQuadra)}</strong></div>
          {r.itens.map((i) => (
            <div key={i.equipamentoId}><span>{i.quantidade}× {i.nome}</span><strong>{moeda(i.subtotal)}</strong></div>
          ))}
          <div className="total"><span>Total</span><strong>{moeda(r.valorTotal)}</strong></div>
          <div><span>Cliente escolheu pagar</span>
            <strong>{r.percentualPagamento >= 100 ? 'Total' : `Sinal ${r.percentualPagamento}%`} ({moeda(r.valorAPagar)})</strong></div>
          {r.observacao && <div className="obs"><span>Observação</span><p>{r.observacao}</p></div>}
          <div><span>Reservado em</span><strong>{new Date(r.criadaEm).toLocaleString('pt-BR')}</strong></div>
        </div>
        <div className="caixa-pagamento">
          <div className="pagamento-topo">
            <strong>💰 Pagamento</strong>
            <span className={`badge pg-${r.statusPagamento.toLowerCase()}`}>{STATUS_PAGAMENTO_LABEL[r.statusPagamento]}</span>
          </div>
          <p className="pequeno">
            Recebido: <strong>{moeda(r.valorPago)}</strong> de {moeda(r.valorTotal)}
            {r.valorPago < r.valorTotal && <> · falta <strong>{moeda(r.valorTotal - r.valorPago)}</strong></>}
          </p>
          <div className="botoes">
            {r.statusPagamento === 'PENDENTE' && r.valorAPagar < r.valorTotal && (
              <button className="btn btn-secundario btn-pequeno" onClick={() => onPagamento(r, r.valorAPagar)}>
                Confirmar sinal ({moeda(r.valorAPagar)})
              </button>
            )}
            {r.statusPagamento !== 'PAGO' && (
              <button className="btn btn-primario btn-pequeno" onClick={() => onPagamento(r, r.valorTotal)}>
                Confirmar pagamento total
              </button>
            )}
            {r.valorPago > 0 && (
              <button className="btn btn-link btn-pequeno" onClick={() => onPagamento(r, 0)}>Zerar</button>
            )}
          </div>
          <div className="linha-filtros valor-manual">
            <label>
              Outro valor recebido (R$)
              <input type="number" min={0} max={r.valorTotal} step="0.01" value={valorManual}
                onChange={(e) => setValorManual(e.target.value)} />
            </label>
            <button className="btn btn-secundario btn-pequeno" onClick={() => onPagamento(r, Number(valorManual))}>Salvar</button>
          </div>
        </div>

        <div className="acoes">
          {r.status === 'CONFIRMADA' && (
            <>
              <button className="btn btn-primario" onClick={() => onStatus(r, 'CONCLUIDA')}>Marcar concluída</button>
              <button className="btn btn-perigo" onClick={() => onStatus(r, 'CANCELADA')}>Cancelar reserva</button>
            </>
          )}
          {r.status !== 'CONFIRMADA' && (
            <button className="btn btn-secundario" onClick={() => onStatus(r, 'CONFIRMADA')}>Reativar</button>
          )}
        </div>
      </div>
    </div>
  );
}
