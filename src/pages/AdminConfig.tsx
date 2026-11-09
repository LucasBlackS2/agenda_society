import { FormEvent, useEffect, useState } from 'react';
import { api, type EquipamentoForm, type EsporteForm, type QuadraForm } from '../api';
import type { ConfigPagamento, Equipamento, EsporteInfo, Quadra, TipoChavePix, TipoQuadra } from '../types';
import { TIPO_CHAVE_LABEL } from '../utils';

interface Props {
  onAlterado: () => void;
  onErro: (e: unknown) => void;
}

type Secao = 'pagamento' | 'quadras' | 'esportes' | 'equipamentos';

export default function AdminConfig({ onAlterado, onErro }: Props) {
  const [secao, setSecao] = useState<Secao>('pagamento');
  const [ok, setOk] = useState<string | null>(null);

  const avisar = (msg: string) => {
    setOk(msg);
    setTimeout(() => setOk(null), 2500);
    onAlterado();
  };

  return (
    <div className="card config">
      <div className="sub-abas">
        <button className={secao === 'pagamento' ? 'ativa' : ''} onClick={() => setSecao('pagamento')}>💳 Recebimento (Pix / conta)</button>
        <button className={secao === 'quadras' ? 'ativa' : ''} onClick={() => setSecao('quadras')}>🏟️ Quadras e preços</button>
        <button className={secao === 'esportes' ? 'ativa' : ''} onClick={() => setSecao('esportes')}>🏐 Esportes</button>
        <button className={secao === 'equipamentos' ? 'ativa' : ''} onClick={() => setSecao('equipamentos')}>🎾 Equipamentos</button>
      </div>
      {ok && <div className="alerta sucesso-msg">{ok}</div>}

      {secao === 'pagamento' && <ConfigPagamentoForm onSalvo={avisar} onErro={onErro} />}
      {secao === 'quadras' && <Quadras onSalvo={avisar} onErro={onErro} />}
      {secao === 'esportes' && <Esportes onSalvo={avisar} onErro={onErro} />}
      {secao === 'equipamentos' && <Equipamentos onSalvo={avisar} onErro={onErro} />}
    </div>
  );
}

interface SubProps {
  onSalvo: (msg: string) => void;
  onErro: (e: unknown) => void;
}

// =====================================================================
// Recebimento: Pix e conta bancária
// =====================================================================

function ConfigPagamentoForm({ onSalvo, onErro }: SubProps) {
  const [c, setC] = useState<ConfigPagamento | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { api.configPagamento().then(setC).catch(onErro); }, [onErro]);

  if (!c) return <p className="muted">Carregando…</p>;

  const set = <K extends keyof ConfigPagamento>(k: K, v: ConfigPagamento[K]) => setC({ ...c, [k]: v });
  const txt = (k: keyof ConfigPagamento) => (c[k] as string | null) ?? '';

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      setC(await api.salvarConfigPagamento(c));
      onSalvo('Dados de recebimento salvos!');
    } catch (err) {
      onErro(err);
    } finally {
      setSalvando(false);
    }
  };

  const placeholderChave: Record<TipoChavePix, string> = {
    CPF: '000.000.000-00',
    CNPJ: '00.000.000/0000-00',
    EMAIL: 'financeiro@arena.com',
    TELEFONE: '(81) 99999-8888',
    ALEATORIA: '123e4567-e89b-12d3-a456-426614174000',
  };

  return (
    <form onSubmit={salvar} className="config-form">
      <section>
        <h3>Sinal mínimo</h3>
        <label className="campo-curto">
          Percentual mínimo que o cliente paga ao reservar (%)
          <input type="number" min={1} max={100} value={c.percentualMinimo}
            onChange={(e) => set('percentualMinimo', Number(e.target.value))} required />
        </label>
        <small className="muted">O cliente escolhe entre pagar esse percentual (sinal) ou o valor total. Use 100 para exigir pagamento total.</small>
      </section>

      <section>
        <label className="toggle">
          <input type="checkbox" checked={c.pixAtivo} onChange={(e) => set('pixAtivo', e.target.checked)} />
          <span>Receber por <strong>Pix</strong> (gera QR Code e copia e cola com o valor)</span>
        </label>
        {c.pixAtivo && (
          <div className="form-grid">
            <label>
              Tipo da chave
              <select value={c.tipoChavePix ?? ''} onChange={(e) => set('tipoChavePix', (e.target.value || null) as TipoChavePix | null)} required>
                <option value="">Selecione…</option>
                {(Object.keys(TIPO_CHAVE_LABEL) as TipoChavePix[]).map((t) => (
                  <option key={t} value={t}>{TIPO_CHAVE_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <label>
              Chave Pix
              <input value={txt('chavePix')} onChange={(e) => set('chavePix', e.target.value)}
                placeholder={c.tipoChavePix ? placeholderChave[c.tipoChavePix] : ''} required />
            </label>
            <label>
              Nome do recebedor (como está no banco)
              <input value={txt('nomeBeneficiario')} onChange={(e) => set('nomeBeneficiario', e.target.value)} maxLength={60} required />
            </label>
            <label>
              Cidade
              <input value={txt('cidadeBeneficiario')} onChange={(e) => set('cidadeBeneficiario', e.target.value)} maxLength={40} required />
            </label>
          </div>
        )}
      </section>

      <section>
        <label className="toggle">
          <input type="checkbox" checked={c.contaAtiva} onChange={(e) => set('contaAtiva', e.target.checked)} />
          <span>Mostrar <strong>conta bancária</strong> para transferência</span>
        </label>
        {c.contaAtiva && (
          <div className="form-grid">
            <label>Banco<input value={txt('banco')} onChange={(e) => set('banco', e.target.value)} placeholder="Ex.: 260 - Nubank" required /></label>
            <label>
              Tipo de conta
              <select value={txt('tipoConta')} onChange={(e) => set('tipoConta', e.target.value || null)}>
                <option value="">—</option>
                <option value="Corrente">Corrente</option>
                <option value="Poupança">Poupança</option>
                <option value="Pagamento">Pagamento</option>
              </select>
            </label>
            <label>Agência<input value={txt('agencia')} onChange={(e) => set('agencia', e.target.value)} required /></label>
            <label>Conta (com dígito)<input value={txt('conta')} onChange={(e) => set('conta', e.target.value)} required /></label>
            <label>Titular<input value={txt('titular')} onChange={(e) => set('titular', e.target.value)} required /></label>
            <label>CPF/CNPJ do titular<input value={txt('documentoTitular')} onChange={(e) => set('documentoTitular', e.target.value)} /></label>
          </div>
        )}
      </section>

      <section>
        <label>
          Instruções para o cliente (opcional)
          <textarea rows={2} maxLength={500} value={txt('instrucoes')} onChange={(e) => set('instrucoes', e.target.value)}
            placeholder="Ex.: Envie o comprovante para o WhatsApp (81) 99999-8888" />
        </label>
      </section>

      <button className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar dados de recebimento'}</button>
    </form>
  );
}

// =====================================================================
// Quadras
// =====================================================================

const QUADRA_VAZIA: QuadraForm = { nome: '', tipo: 'AREIA', precoHora: 0, ativa: true };

function Quadras({ onSalvo, onErro }: SubProps) {
  const [lista, setLista] = useState<Quadra[]>([]);
  const carregar = () => api.quadrasAdmin().then(setLista).catch(onErro);
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async (f: QuadraForm, id?: number) => {
    try {
      await api.salvarQuadra(f, id);
      await carregar();
      onSalvo(id ? 'Quadra atualizada!' : 'Quadra adicionada!');
      return true;
    } catch (e) {
      onErro(e);
      return false;
    }
  };

  return (
    <div className="tabela-wrap">
      <table className="tabela tabela-edit">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Preço/hora (R$)</th><th>Ativa</th><th></th></tr></thead>
        <tbody>
          {lista.map((q) => (
            <LinhaQuadra key={q.id} inicial={{ nome: q.nome, tipo: q.tipo, precoHora: q.precoHora, ativa: q.ativa }}
              onSalvar={(f) => salvar(f, q.id)} />
          ))}
          <LinhaQuadra novo inicial={QUADRA_VAZIA} onSalvar={(f) => salvar(f)} />
        </tbody>
      </table>
    </div>
  );
}

function LinhaQuadra({ inicial, onSalvar, novo }: { inicial: QuadraForm; onSalvar: (f: QuadraForm) => Promise<boolean>; novo?: boolean }) {
  const [f, setF] = useState(inicial);
  const mudou = JSON.stringify(f) !== JSON.stringify(inicial);
  const salvar = async () => { if ((await onSalvar(f)) && novo) setF(QUADRA_VAZIA); };
  return (
    <tr className={novo ? 'linha-nova' : ''}>
      <td><input value={f.nome} placeholder={novo ? 'Nova quadra…' : ''} onChange={(e) => setF({ ...f, nome: e.target.value })} /></td>
      <td>
        <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoQuadra })}>
          <option value="AREIA">Areia</option>
          <option value="SOCIETY">Society</option>
        </select>
      </td>
      <td><input type="number" min={0} step="0.01" value={f.precoHora} onChange={(e) => setF({ ...f, precoHora: Number(e.target.value) })} /></td>
      <td><input type="checkbox" checked={f.ativa} onChange={(e) => setF({ ...f, ativa: e.target.checked })} /></td>
      <td>
        <button className="btn btn-primario btn-pequeno" disabled={!mudou || !f.nome.trim()} onClick={salvar}>
          {novo ? 'Adicionar' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}

// =====================================================================
// Esportes
// =====================================================================

const ESPORTE_VAZIO: EsporteForm = { nome: '', tipoQuadra: 'AREIA', icone: '🏅', cor: '#64748b', ativo: true };

function Esportes({ onSalvo, onErro }: SubProps) {
  const [lista, setLista] = useState<EsporteInfo[]>([]);
  const carregar = () => api.esportesAdmin().then(setLista).catch(onErro);
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async (f: EsporteForm, id?: number) => {
    try {
      await api.salvarEsporte(f, id);
      await carregar();
      onSalvo(id ? 'Esporte atualizado!' : 'Esporte adicionado!');
      return true;
    } catch (e) {
      onErro(e);
      return false;
    }
  };

  return (
    <>
      <p className="muted pequeno">
        Esportes de <strong>areia</strong> aparecem nas quadras de areia; de <strong>society</strong>, no campo.
        Para tirar um esporte da tela de reservas, desmarque “Ativo”.
      </p>
      <div className="tabela-wrap">
        <table className="tabela tabela-edit">
          <thead><tr><th>Ícone</th><th>Nome</th><th>Quadra</th><th>Cor</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            {lista.map((e) => (
              <LinhaEsporte key={e.id}
                inicial={{ nome: e.nome, tipoQuadra: e.tipoQuadra, icone: e.icone ?? '🏅', cor: e.cor ?? '#64748b', ativo: e.ativo }}
                onSalvar={(f) => salvar(f, e.id)} />
            ))}
            <LinhaEsporte novo inicial={ESPORTE_VAZIO} onSalvar={(f) => salvar(f)} />
          </tbody>
        </table>
      </div>
    </>
  );
}

function LinhaEsporte({ inicial, onSalvar, novo }: { inicial: EsporteForm; onSalvar: (f: EsporteForm) => Promise<boolean>; novo?: boolean }) {
  const [f, setF] = useState(inicial);
  const mudou = JSON.stringify(f) !== JSON.stringify(inicial);
  const salvar = async () => { if ((await onSalvar(f)) && novo) setF(ESPORTE_VAZIO); };
  return (
    <tr className={novo ? 'linha-nova' : ''}>
      <td><input className="input-icone" value={f.icone} maxLength={4} onChange={(e) => setF({ ...f, icone: e.target.value })} /></td>
      <td><input value={f.nome} placeholder={novo ? 'Novo esporte (ex.: Handebol de areia)' : ''} onChange={(e) => setF({ ...f, nome: e.target.value })} /></td>
      <td>
        <select value={f.tipoQuadra} onChange={(e) => setF({ ...f, tipoQuadra: e.target.value as TipoQuadra })}>
          <option value="AREIA">Areia</option>
          <option value="SOCIETY">Society</option>
        </select>
      </td>
      <td><input type="color" value={f.cor} onChange={(e) => setF({ ...f, cor: e.target.value })} /></td>
      <td><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /></td>
      <td>
        <button className="btn btn-primario btn-pequeno" disabled={!mudou || !f.nome.trim()} onClick={salvar}>
          {novo ? 'Adicionar' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}

// =====================================================================
// Equipamentos
// =====================================================================

function Equipamentos({ onSalvo, onErro }: SubProps) {
  const [lista, setLista] = useState<Equipamento[]>([]);
  const [esportes, setEsportes] = useState<EsporteInfo[]>([]);
  const carregar = () =>
    Promise.all([api.equipamentosAdmin(), api.esportesAdmin()])
      .then(([eq, es]) => { setLista(eq); setEsportes(es); })
      .catch(onErro);
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async (f: EquipamentoForm, id?: number) => {
    try {
      await api.salvarEquipamento(f, id);
      await carregar();
      onSalvo(id ? 'Equipamento atualizado!' : 'Equipamento adicionado!');
      return true;
    } catch (e) {
      onErro(e);
      return false;
    }
  };

  if (esportes.length === 0) return <p className="muted">Cadastre um esporte primeiro.</p>;
  const vazio: EquipamentoForm = { nome: '', esporteId: esportes[0].id, quantidadeTotal: 1, precoAluguel: 0, ativo: true };

  return (
    <div className="tabela-wrap">
      <table className="tabela tabela-edit">
        <thead><tr><th>Equipamento</th><th>Esporte</th><th>Quantidade</th><th>Aluguel (R$)</th><th>Ativo</th><th></th></tr></thead>
        <tbody>
          {lista.map((e) => (
            <LinhaEquipamento key={e.id} esportes={esportes}
              inicial={{ nome: e.nome, esporteId: e.esporteId, quantidadeTotal: e.quantidadeTotal, precoAluguel: e.precoAluguel, ativo: e.ativo }}
              onSalvar={(f) => salvar(f, e.id)} />
          ))}
          <LinhaEquipamento novo esportes={esportes} inicial={vazio} onSalvar={(f) => salvar(f)} />
        </tbody>
      </table>
    </div>
  );
}

function LinhaEquipamento({ inicial, esportes, onSalvar, novo }: {
  inicial: EquipamentoForm;
  esportes: EsporteInfo[];
  onSalvar: (f: EquipamentoForm) => Promise<boolean>;
  novo?: boolean;
}) {
  const [f, setF] = useState(inicial);
  const mudou = JSON.stringify(f) !== JSON.stringify(inicial);
  const salvar = async () => { if ((await onSalvar(f)) && novo) setF(inicial); };
  return (
    <tr className={novo ? 'linha-nova' : ''}>
      <td><input value={f.nome} placeholder={novo ? 'Novo equipamento (ex.: Raquete profissional)' : ''} onChange={(e) => setF({ ...f, nome: e.target.value })} /></td>
      <td>
        <select value={f.esporteId} onChange={(e) => setF({ ...f, esporteId: Number(e.target.value) })}>
          {esportes.map((es) => <option key={es.id} value={es.id}>{es.nome}{es.ativo ? '' : ' (inativo)'}</option>)}
        </select>
      </td>
      <td><input type="number" min={0} value={f.quantidadeTotal} onChange={(e) => setF({ ...f, quantidadeTotal: Number(e.target.value) })} /></td>
      <td><input type="number" min={0} step="0.01" value={f.precoAluguel} onChange={(e) => setF({ ...f, precoAluguel: Number(e.target.value) })} /></td>
      <td><input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} /></td>
      <td>
        <button className="btn btn-primario btn-pequeno" disabled={!mudou || !f.nome.trim()} onClick={salvar}>
          {novo ? 'Adicionar' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}
