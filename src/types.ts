export type TipoQuadra = 'AREIA' | 'SOCIETY';
export type StatusReserva = 'CONFIRMADA' | 'CONCLUIDA' | 'CANCELADA';
export type StatusPagamento = 'PENDENTE' | 'PARCIAL' | 'PAGO';
export type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

export interface Config {
  horaAbertura: number;
  horaFechamento: number;
  duracaoMaximaHoras: number;
  percentualMinimo: number;
  pixAtivo: boolean;
  contaAtiva: boolean;
}

export interface Quadra {
  id: number;
  nome: string;
  tipo: TipoQuadra;
  precoHora: number;
  ativa: boolean;
}

export interface EsporteInfo {
  id: number;
  nome: string;
  tipoQuadra: TipoQuadra;
  icone: string | null;
  cor: string | null;
  ativo: boolean;
}

export interface Equipamento {
  id: number;
  nome: string;
  esporteId: number;
  esporteNome: string;
  quantidadeTotal: number;
  precoAluguel: number;
  ativo: boolean;
}

export interface Horario {
  inicio: string; // "08:00"
  fim: string;
  disponivel: boolean;
}

export interface EquipamentoDisponivel {
  id: number;
  nome: string;
  precoAluguel: number;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
}

export interface ItemReserva {
  equipamentoId: number;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
}

export interface Reserva {
  id: number;
  quadraId: number;
  quadraNome: string;
  quadraTipo: TipoQuadra;
  data: string; // "2026-11-10"
  horaInicio: string;
  horaFim: string;
  esporteId: number;
  esporteNome: string;
  esporteIcone: string | null;
  esporteCor: string | null;
  nomeCliente: string;
  telefone: string;
  email: string | null;
  observacao: string | null;
  status: StatusReserva;
  valorQuadra: number;
  valorEquipamentos: number;
  valorTotal: number;
  percentualPagamento: number;
  valorAPagar: number;
  valorPago: number;
  statusPagamento: StatusPagamento;
  criadaEm: string;
  itens: ItemReserva[];
}

export interface NovaReserva {
  quadraId: number;
  data: string;
  horaInicio: number;
  duracaoHoras: number;
  esporteId: number;
  nomeCliente: string;
  telefone: string;
  email?: string;
  observacao?: string;
  pagamentoTotal: boolean;
  itens: { equipamentoId: number; quantidade: number }[];
}

export interface Pix {
  copiaECola: string;
  tipoChave: TipoChavePix;
  chave: string;
  beneficiario: string;
  cidade: string;
  valor: number;
}

export interface ContaBancaria {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string | null;
  titular: string;
  documento: string | null;
}

export interface Pagamento {
  reservaId: number;
  valorTotal: number;
  percentualPagamento: number;
  valorAPagar: number;
  valorPago: number;
  valorRestante: number;
  valorAgora: number;
  statusPagamento: StatusPagamento;
  pix: Pix | null;
  conta: ContaBancaria | null;
  instrucoes: string | null;
}

export interface ConfigPagamento {
  percentualMinimo: number;
  pixAtivo: boolean;
  tipoChavePix: TipoChavePix | null;
  chavePix: string | null;
  nomeBeneficiario: string | null;
  cidadeBeneficiario: string | null;
  contaAtiva: boolean;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoConta: string | null;
  titular: string | null;
  documentoTitular: string | null;
  instrucoes: string | null;
}

export interface Resumo {
  data: string;
  totalReservas: number;
  canceladas: number;
  horasOcupadas: number;
  faturamentoPrevisto: number;
  valorRecebido: number;
  valorAReceber: number;
  ocupacao: { quadraId: number; nome: string; horasReservadas: number; horasFuncionamento: number; percentual: number }[];
  reservasPorEsporte: Record<string, number>;
  equipamentosAlugados: Record<string, number>;
}
