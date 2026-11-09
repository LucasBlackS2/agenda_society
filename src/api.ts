import type {
  Config, ConfigPagamento, Equipamento, EquipamentoDisponivel, EsporteInfo, Horario, NovaReserva,
  Pagamento, Quadra, Reserva, Resumo, StatusReserva, TipoQuadra,
} from './types';

export interface QuadraForm { nome: string; tipo: TipoQuadra; precoHora: number; ativa: boolean }
export interface EsporteForm { nome: string; tipoQuadra: TipoQuadra; icone: string; cor: string; ativo: boolean }
export interface EquipamentoForm { nome: string; esporteId: number; quantidadeTotal: number; precoAluguel: number; ativo: boolean }

// Com o proxy do Vite, basta usar caminhos relativos.
// Para apontar para outro servidor, crie um .env com VITE_API_URL=http://servidor:8080
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const TOKEN_KEY = 'agenda_admin_token';

function lerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const auth = {
  token: lerToken,
  logado: () => !!lerToken(),
  salvar(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignora */ }
  },
  sair() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignora */ }
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, admin = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (admin) {
    const token = lerToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let resp: Response;
  try {
    resp = await fetch(BASE + path, { ...options, headers: { ...headers, ...(options.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. O back-end está rodando?');
  }

  if (resp.status === 401 && admin) {
    auth.sair();
  }
  if (!resp.ok) {
    let msg = `Erro ${resp.status}`;
    try {
      const body = await resp.json();
      if (body?.mensagem) msg = body.mensagem;
    } catch { /* corpo vazio */ }
    throw new ApiError(resp.status, msg);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json() as Promise<T>;
}

const qs = (params: Record<string, string | number | undefined | null>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

export const api = {
  // ----- público -----
  config: () => request<Config>('/api/config'),
  quadras: () => request<Quadra[]>('/api/quadras'),
  esportes: () => request<EsporteInfo[]>('/api/esportes'),
  disponibilidade: (quadraId: number, data: string) =>
    request<Horario[]>(`/api/quadras/${quadraId}/disponibilidade?${qs({ data })}`),
  equipamentosDisponiveis: (esporteId: number, data: string, horaInicio: number, duracao: number) =>
    request<EquipamentoDisponivel[]>(`/api/equipamentos/disponiveis?${qs({ esporteId, data, horaInicio, duracao })}`),
  reservar: (dados: NovaReserva) =>
    request<Reserva>('/api/reservas', { method: 'POST', body: JSON.stringify(dados) }),
  minhasReservas: (telefone: string) => request<Reserva[]>(`/api/reservas/minhas?${qs({ telefone })}`),
  pagamento: (id: number, telefone: string) =>
    request<Pagamento>(`/api/reservas/${id}/pagamento?${qs({ telefone })}`),
  cancelarMinha: (id: number, telefone: string) =>
    request<Reserva>(`/api/reservas/${id}/cancelar?${qs({ telefone })}`, { method: 'PATCH' }),

  // ----- admin -----
  login: (usuario: string, senha: string) =>
    request<{ token: string; usuario: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, senha }),
    }),
  logout: () => request<void>('/api/admin/logout', { method: 'POST' }, true),
  reservasAdmin: (inicio: string, fim?: string, quadraId?: number, status?: StatusReserva) =>
    request<Reserva[]>(`/api/admin/reservas?${qs({ inicio, fim, quadraId, status })}`, {}, true),
  alterarStatus: (id: number, status: StatusReserva) =>
    request<Reserva>(`/api/admin/reservas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, true),
  atualizarPagamento: (id: number, valorPago: number) =>
    request<Reserva>(`/api/admin/reservas/${id}/pagamento`, { method: 'PATCH', body: JSON.stringify({ valorPago }) }, true),
  resumo: (data: string) => request<Resumo>(`/api/admin/resumo?${qs({ data })}`, {}, true),

  // ----- admin: configurações -----
  configPagamento: () => request<ConfigPagamento>('/api/admin/config-pagamento', {}, true),
  salvarConfigPagamento: (c: ConfigPagamento) =>
    request<ConfigPagamento>('/api/admin/config-pagamento', { method: 'PUT', body: JSON.stringify(c) }, true),

  quadrasAdmin: () => request<Quadra[]>('/api/admin/quadras', {}, true),
  salvarQuadra: (f: QuadraForm, id?: number) =>
    request<Quadra>(id ? `/api/admin/quadras/${id}` : '/api/admin/quadras',
      { method: id ? 'PUT' : 'POST', body: JSON.stringify(f) }, true),

  esportesAdmin: () => request<EsporteInfo[]>('/api/admin/esportes', {}, true),
  salvarEsporte: (f: EsporteForm, id?: number) =>
    request<EsporteInfo>(id ? `/api/admin/esportes/${id}` : '/api/admin/esportes',
      { method: id ? 'PUT' : 'POST', body: JSON.stringify(f) }, true),

  equipamentosAdmin: () => request<Equipamento[]>('/api/admin/equipamentos', {}, true),
  salvarEquipamento: (f: EquipamentoForm, id?: number) =>
    request<Equipamento>(id ? `/api/admin/equipamentos/${id}` : '/api/admin/equipamentos',
      { method: id ? 'PUT' : 'POST', body: JSON.stringify(f) }, true),
};
