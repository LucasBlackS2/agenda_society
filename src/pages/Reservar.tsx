import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import PagamentoInfo from '../components/PagamentoInfo';
import type { Config, EquipamentoDisponivel, EsporteInfo, Horario, Pagamento, Quadra, Reserva } from '../types';
import { dataBR, hojeISO, horaNumero, icone, mascaraTelefone, moeda, somarDias } from '../utils';

const TELEFONE_KEY = 'agenda_telefone';

export default function Reservar() {
  // catálogo
  const [config, setConfig] = useState<Config>({
    horaAbertura: 8, horaFechamento: 23, duracaoMaximaHoras: 4, percentualMinimo: 50, pixAtivo: false, contaAtiva: false,
  });
  const [quadras, setQuadras] = useState<Quadra[]>([]);
  const [esportes, setEsportes] = useState<EsporteInfo[]>([]);

  // escolhas
  const [esporte, setEsporte] = useState<number | null>(null); // id do esporte
  const [quadraId, setQuadraId] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [horaInicio, setHoraInicio] = useState<number | null>(null);
  const [duracao, setDuracao] = useState(1);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDisponivel[]>([]);
  const [quantidades, setQuantidades] = useState<Record<number, number>>({});

  // dados pessoais
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState(() => {
    try { return mascaraTelefone(localStorage.getItem(TELEFONE_KEY) ?? ''); } catch { return ''; }
  });
  const [email, setEmail] = useState('');
  const [observacao, setObservacao] = useState('');

  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState<Reserva | null>(null);
  const [pagamentoTotal, setPagamentoTotal] = useState(false);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);

  // ---------- carregamentos ----------
  useEffect(() => {
    Promise.all([api.config(), api.quadras(), api.esportes()])
      .then(([c, q, e]) => { setConfig(c); setQuadras(q); setEsportes(e); })
      .catch((e: Error) => setErro(e.message));
  }, []);

  const esporteInfo = esportes.find((e) => e.id === esporte) ?? null;
  const quadrasDoEsporte = useMemo(
    () => (esporteInfo ? quadras.filter((q) => q.tipo === esporteInfo.tipoQuadra) : []),
    [quadras, esporteInfo],
  );
  const quadra = quadras.find((q) => q.id === quadraId) ?? null;

  // ao trocar de esporte, escolhe a quadra automaticamente se só houver uma
  useEffect(() => {
    if (!esporteInfo) return;
    if (quadra && quadra.tipo === esporteInfo.tipoQuadra) return;
    setQuadraId(quadrasDoEsporte.length === 1 ? quadrasDoEsporte[0].id : null);
  }, [esporteInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarHorarios = () => {
    if (!quadraId) { setHorarios([]); return; }
    setCarregandoHorarios(true);
    api.disponibilidade(quadraId, data)
      .then(setHorarios)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregandoHorarios(false));
  };

  useEffect(() => {
    setHoraInicio(null);
    carregarHorarios();
  }, [quadraId, data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!esporte || horaInicio === null) { setEquipamentos([]); return; }
    api.equipamentosDisponiveis(esporte, data, horaInicio, duracao)
      .then((lista) => {
        setEquipamentos(lista);
        // ajusta quantidades que ficaram acima do disponível
        setQuantidades((atual) => {
          const novo: Record<number, number> = {};
          for (const eq of lista) {
            const q = Math.min(atual[eq.id] ?? 0, eq.quantidadeDisponivel);
            if (q > 0) novo[eq.id] = q;
          }
          return novo;
        });
      })
      .catch((e: Error) => setErro(e.message));
  }, [esporte, data, horaInicio, duracao]);

  // ---------- horários ----------
  const livre = (h: number) => horarios.find((x) => horaNumero(x.inicio) === h)?.disponivel ?? false;
  const intervaloLivre = (inicio: number, dur: number) => {
    if (inicio + dur > config.horaFechamento) return false;
    for (let h = inicio; h < inicio + dur; h++) if (!livre(h)) return false;
    return true;
  };

  const selecionarHorario = (h: number) => {
    setAviso(null);
    if (!livre(h)) return;
    if (intervaloLivre(h, duracao)) {
      setHoraInicio(h);
    } else {
      setHoraInicio(null);
      setAviso(`Não há ${duracao}h seguidas livres a partir das ${String(h).padStart(2, '0')}:00. Diminua a duração ou escolha outro horário.`);
    }
  };

  const mudarDuracao = (d: number) => {
    setDuracao(d);
    setAviso(null);
    if (horaInicio !== null && !intervaloLivre(horaInicio, d)) {
      setHoraInicio(null);
      setAviso('O horário escolhido não comporta essa duração. Selecione outro horário.');
    }
  };

  // ---------- valores ----------
  const valorQuadra = quadra ? quadra.precoHora * duracao : 0;
  const valorEquip = equipamentos.reduce((s, eq) => s + (quantidades[eq.id] ?? 0) * eq.precoAluguel, 0);
  const total = valorQuadra + valorEquip;
  const percentual = pagamentoTotal || config.percentualMinimo >= 100 ? 100 : config.percentualMinimo;
  const valorAgora = Math.round(total * percentual) / 100;

  const alterarQtd = (eq: EquipamentoDisponivel, delta: number) => {
    setQuantidades((q) => {
      const atual = q[eq.id] ?? 0;
      const novo = Math.max(0, Math.min(eq.quantidadeDisponivel, atual + delta));
      return { ...q, [eq.id]: novo };
    });
  };

  const podeEnviar = !!esporte && !!quadraId && horaInicio !== null && nome.trim().length > 1
    && telefone.replace(/\D/g, '').length >= 10 && !enviando;

  // ---------- envio ----------
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!podeEnviar || !esporte || !quadraId || horaInicio === null) return;
    setErro(null);
    setEnviando(true);
    try {
      const reserva = await api.reservar({
        quadraId,
        data,
        horaInicio,
        duracaoHoras: duracao,
        esporteId: esporte,
        nomeCliente: nome.trim(),
        telefone,
        email: email.trim() || undefined,
        observacao: observacao.trim() || undefined,
        pagamentoTotal: percentual >= 100,
        itens: Object.entries(quantidades)
          .filter(([, q]) => q > 0)
          .map(([id, q]) => ({ equipamentoId: Number(id), quantidade: q })),
      });
      try { localStorage.setItem(TELEFONE_KEY, telefone.replace(/\D/g, '')); } catch { /* ignora */ }
      setSucesso(reserva);
      setPagamento(null);
      api.pagamento(reserva.id, telefone).then(setPagamento).catch(() => setPagamento(null));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErro((err as Error).message);
      carregarHorarios(); // alguém pode ter reservado antes
    } finally {
      setEnviando(false);
    }
  };

  const novaReserva = () => {
    setSucesso(null);
    setPagamento(null);
    setHoraInicio(null);
    setQuantidades({});
    setObservacao('');
    carregarHorarios();
  };

  // ---------- tela de sucesso ----------
  if (sucesso) {
    return (
      <div className="card sucesso">
        <div className="sucesso-icone">✅</div>
        <h2>Reserva confirmada!</h2>
        <p className="muted">Código da reserva: <strong>#{sucesso.id}</strong></p>
        <div className="resumo-linhas">
          <div><span>Esporte</span><strong>{icone(sucesso.esporteIcone)} {sucesso.esporteNome}</strong></div>
          <div><span>Quadra</span><strong>{sucesso.quadraNome}</strong></div>
          <div><span>Data</span><strong>{dataBR(sucesso.data)}</strong></div>
          <div><span>Horário</span><strong>{sucesso.horaInicio} às {sucesso.horaFim}</strong></div>
          {sucesso.itens.map((i) => (
            <div key={i.equipamentoId}><span>{i.quantidade}× {i.nome}</span><strong>{moeda(i.subtotal)}</strong></div>
          ))}
          <div className="total"><span>Total</span><strong>{moeda(sucesso.valorTotal)}</strong></div>
        </div>
        {pagamento ? <PagamentoInfo p={pagamento} /> : <p className="muted">Carregando dados de pagamento…</p>}
        <div className="acoes">
          <button className="btn btn-primario" onClick={novaReserva}>Fazer outra reserva</button>
          <Link to="/minhas-reservas" className="btn btn-secundario">Minhas reservas</Link>
        </div>
      </div>
    );
  }

  // ---------- formulário ----------
  return (
    <form className="reservar" onSubmit={enviar}>
      <h1>Nova reserva</h1>
      {erro && <div className="alerta erro" onClick={() => setErro(null)}>{erro}</div>}

      <div className="reservar-grid">
        <div className="passos">
          {/* 1. Esporte */}
          <section className="card">
            <h2><span className="passo">1</span> Qual esporte?</h2>
            <div className="opcoes esportes">
              {esportes.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className={`opcao ${esporte === e.id ? 'ativa' : ''}`}
                  onClick={() => setEsporte(e.id)}
                >
                  <span className="opcao-icone">{icone(e.icone)}</span>
                  <span>{e.nome}</span>
                  <small>{e.tipoQuadra === 'AREIA' ? 'Quadra de areia' : 'Campo society'}</small>
                </button>
              ))}
            </div>
          </section>

          {/* 2. Quadra */}
          {esporte && (
            <section className="card">
              <h2><span className="passo">2</span> Qual quadra?</h2>
              <div className="opcoes">
                {quadrasDoEsporte.map((q) => (
                  <button
                    type="button"
                    key={q.id}
                    className={`opcao ${quadraId === q.id ? 'ativa' : ''}`}
                    onClick={() => setQuadraId(q.id)}
                  >
                    <span className="opcao-icone">{q.tipo === 'AREIA' ? '🏖️' : '🥅'}</span>
                    <span>{q.nome}</span>
                    <small>{moeda(q.precoHora)}/hora</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. Data e horário */}
          {quadraId && (
            <section className="card">
              <h2><span className="passo">3</span> Data e horário</h2>
              <div className="linha-filtros">
                <label>
                  Data
                  <input
                    type="date"
                    value={data}
                    min={hojeISO()}
                    max={somarDias(hojeISO(), 60)}
                    onChange={(e) => e.target.value && setData(e.target.value)}
                  />
                </label>
                <label>
                  Duração
                  <select value={duracao} onChange={(e) => mudarDuracao(Number(e.target.value))}>
                    {Array.from({ length: config.duracaoMaximaHoras }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d} hora{d > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </label>
              </div>

              {carregandoHorarios ? (
                <p className="muted">Carregando horários…</p>
              ) : (
                <div className="horarios">
                  {horarios.map((h) => {
                    const n = horaNumero(h.inicio);
                    const selecionado = horaInicio !== null && n >= horaInicio && n < horaInicio + duracao;
                    return (
                      <button
                        type="button"
                        key={h.inicio}
                        disabled={!h.disponivel}
                        className={`horario ${selecionado ? 'selecionado' : ''}`}
                        onClick={() => selecionarHorario(n)}
                        title={h.disponivel ? 'Livre' : 'Indisponível'}
                      >
                        {h.inicio}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="legenda">
                <span><i className="leg livre" /> Livre</span>
                <span><i className="leg ocupado" /> Ocupado / passou</span>
                <span><i className="leg sel" /> Sua escolha</span>
              </div>
              {aviso && <div className="alerta aviso">{aviso}</div>}
            </section>
          )}

          {/* 4. Equipamentos */}
          {horaInicio !== null && (
            <section className="card">
              <h2><span className="passo">4</span> Alugar equipamentos <small className="muted">(opcional)</small></h2>
              {equipamentos.length === 0 ? (
                <p className="muted">Não há equipamentos para aluguel neste esporte.</p>
              ) : (
                <ul className="equipamentos">
                  {equipamentos.map((eq) => {
                    const q = quantidades[eq.id] ?? 0;
                    return (
                      <li key={eq.id}>
                        <div>
                          <strong>{eq.nome}</strong>
                          <small className="muted">
                            {moeda(eq.precoAluguel)} cada · {eq.quantidadeDisponivel} disponível(is)
                          </small>
                        </div>
                        <div className="contador">
                          <button type="button" onClick={() => alterarQtd(eq, -1)} disabled={q === 0}>−</button>
                          <span>{q}</span>
                          <button type="button" onClick={() => alterarQtd(eq, 1)} disabled={q >= eq.quantidadeDisponivel}>+</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* 5. Dados */}
          {horaInicio !== null && (
            <section className="card">
              <h2><span className="passo">5</span> Seus dados</h2>
              <div className="form-grid">
                <label>
                  Nome *
                  <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required />
                </label>
                <label>
                  WhatsApp / telefone *
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                    placeholder="(81) 99999-8888"
                    inputMode="tel"
                    required
                  />
                </label>
                <label>
                  E-mail
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
                </label>
                <label className="col-2">
                  Observação
                  <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} rows={2} />
                </label>
              </div>
            </section>
          )}

          {/* 6. Pagamento */}
          {horaInicio !== null && (
            <section className="card">
              <h2><span className="passo">6</span> Pagamento</h2>
              {config.percentualMinimo >= 100 ? (
                <p>O pagamento é do valor total: <strong>{moeda(total)}</strong>.</p>
              ) : (
                <div className="opcoes pagamento-opcoes">
                  <button
                    type="button"
                    className={`opcao ${!pagamentoTotal ? 'ativa' : ''}`}
                    onClick={() => setPagamentoTotal(false)}
                  >
                    <span className="opcao-icone">💵</span>
                    <span>Sinal de {config.percentualMinimo}%</span>
                    <strong>{moeda(Math.round(total * config.percentualMinimo) / 100)}</strong>
                    <small>restante no local</small>
                  </button>
                  <button
                    type="button"
                    className={`opcao ${pagamentoTotal ? 'ativa' : ''}`}
                    onClick={() => setPagamentoTotal(true)}
                  >
                    <span className="opcao-icone">✅</span>
                    <span>Valor total</span>
                    <strong>{moeda(total)}</strong>
                    <small>já fica tudo pago</small>
                  </button>
                </div>
              )}
              <p className="muted pequeno">
                {config.pixAtivo
                  ? 'Ao confirmar, aparecerá o QR Code do Pix com o valor escolhido.'
                  : config.contaAtiva
                    ? 'Ao confirmar, aparecerão os dados da conta para transferência.'
                    : 'O pagamento será combinado no local.'}
              </p>
            </section>
          )}
        </div>

        {/* Resumo lateral */}
        <aside className="card resumo-lateral">
          <h2>Resumo</h2>
          <div className="resumo-linhas">
            <div><span>Esporte</span><strong>{esporteInfo ? `${icone(esporteInfo.icone)} ${esporteInfo.nome}` : '—'}</strong></div>
            <div><span>Quadra</span><strong>{quadra?.nome ?? '—'}</strong></div>
            <div><span>Data</span><strong>{dataBR(data)}</strong></div>
            <div>
              <span>Horário</span>
              <strong>
                {horaInicio !== null
                  ? `${String(horaInicio).padStart(2, '0')}:00 às ${String(horaInicio + duracao).padStart(2, '0')}:00`
                  : '—'}
              </strong>
            </div>
            {quadra && <div><span>Quadra ({duracao}h)</span><strong>{moeda(valorQuadra)}</strong></div>}
            {equipamentos.filter((eq) => (quantidades[eq.id] ?? 0) > 0).map((eq) => (
              <div key={eq.id}>
                <span>{quantidades[eq.id]}× {eq.nome}</span>
                <strong>{moeda(quantidades[eq.id] * eq.precoAluguel)}</strong>
              </div>
            ))}
            <div className="total"><span>Total</span><strong>{moeda(total)}</strong></div>
            {horaInicio !== null && (
              <div className="pagar-agora">
                <span>{percentual >= 100 ? 'Pagar agora (total)' : `Pagar agora (sinal ${percentual}%)`}</span>
                <strong>{moeda(valorAgora)}</strong>
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primario btn-bloco" disabled={!podeEnviar}>
            {enviando ? 'Reservando…' : 'Confirmar reserva'}
          </button>
          {!podeEnviar && !enviando && (
            <small className="muted centro">Preencha todos os passos para confirmar.</small>
          )}
        </aside>
      </div>
    </form>
  );
}
