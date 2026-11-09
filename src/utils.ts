import type { StatusPagamento, StatusReserva, TipoChavePix } from './types';

export const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Data local no formato yyyy-mm-dd (sem problemas de fuso). */
export function hojeISO(): string {
  return paraISO(new Date());
}

export function paraISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

export function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return paraISO(new Date(y, m - 1, d + dias));
}

export function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function telefoneBR(t: string): string {
  const d = t.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

/** Máscara enquanto digita: (81) 99999-8888 */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const horaNumero = (hhmm: string) => Number(hhmm.split(':')[0]);

/** Ícone do esporte com valor padrão. */
export const icone = (i: string | null | undefined) => i || '🏅';
export const cor = (c: string | null | undefined) => c || '#64748b';

export const STATUS_PAGAMENTO_LABEL: Record<StatusPagamento, string> = {
  PENDENTE: 'Pagamento pendente',
  PARCIAL: 'Sinal pago',
  PAGO: 'Pago',
};

export const TIPO_CHAVE_LABEL: Record<TipoChavePix, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  ALEATORIA: 'Chave aleatória',
};

export const STATUS_LABEL: Record<StatusReserva, string> = {
  CONFIRMADA: 'Confirmada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};
