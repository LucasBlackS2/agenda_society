import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Pagamento } from '../types';
import { moeda, STATUS_PAGAMENTO_LABEL, TIPO_CHAVE_LABEL } from '../utils';

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // alternativa para navegadores sem permissão de clipboard
    const area = document.createElement('textarea');
    area.value = texto;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  }
}

export default function PagamentoInfo({ p }: { p: Pagamento }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiarCampo = async (nome: string, texto: string) => {
    if (await copiar(texto)) {
      setCopiado(nome);
      setTimeout(() => setCopiado(null), 2000);
    }
  };

  if (p.statusPagamento === 'PAGO') {
    return (
      <div className="pagamento">
        <div className="alerta sucesso-msg">✅ Pagamento confirmado: {moeda(p.valorPago)}</div>
      </div>
    );
  }

  const titulo = p.statusPagamento === 'PARCIAL'
    ? `Sinal recebido (${moeda(p.valorPago)}). Falta pagar ${moeda(p.valorRestante)}`
    : p.percentualPagamento >= 100
      ? `Pague o valor total: ${moeda(p.valorAgora)}`
      : `Pague o sinal de ${p.percentualPagamento}%: ${moeda(p.valorAgora)}`;

  return (
    <div className="pagamento">
      <div className="pagamento-topo">
        <h3>{titulo}</h3>
        <span className={`badge pg-${p.statusPagamento.toLowerCase()}`}>{STATUS_PAGAMENTO_LABEL[p.statusPagamento]}</span>
      </div>
      {p.statusPagamento === 'PENDENTE' && p.percentualPagamento < 100 && (
        <p className="muted pequeno">O restante ({moeda(p.valorTotal - p.valorAgora)}) pode ser pago no local.</p>
      )}

      {p.pix && (
        <div className="pix">
          <div className="pix-qr">
            <QRCodeSVG value={p.pix.copiaECola} size={210} />
          </div>
          <div className="pix-dados">
            <strong>Pix — abra o app do banco e leia o QR Code</strong>
            <span className="muted pequeno">ou use o “Pix copia e cola”:</span>
            <textarea readOnly value={p.pix.copiaECola} rows={4} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-primario" onClick={() => copiarCampo('pix', p.pix!.copiaECola)}>
              {copiado === 'pix' ? '✔ Copiado!' : '📋 Copiar código Pix'}
            </button>
            <div className="resumo-linhas">
              <div><span>Valor</span><strong>{moeda(p.pix.valor)}</strong></div>
              <div><span>Recebedor</span><strong>{p.pix.beneficiario}</strong></div>
              <div>
                <span>Chave ({TIPO_CHAVE_LABEL[p.pix.tipoChave]})</span>
                <strong>
                  {p.pix.chave}{' '}
                  <button type="button" className="btn-link mini" onClick={() => copiarCampo('chave', p.pix!.chave)}>
                    {copiado === 'chave' ? 'copiado' : 'copiar'}
                  </button>
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {p.conta && (
        <div className="conta-bancaria">
          <strong>🏦 {p.pix ? 'Ou faça uma transferência' : 'Transferência bancária'}</strong>
          <div className="resumo-linhas">
            <div><span>Banco</span><strong>{p.conta.banco}</strong></div>
            <div><span>Agência</span><strong>{p.conta.agencia}</strong></div>
            <div><span>Conta{p.conta.tipoConta ? ` ${p.conta.tipoConta.toLowerCase()}` : ''}</span><strong>{p.conta.conta}</strong></div>
            <div><span>Titular</span><strong>{p.conta.titular}</strong></div>
            {p.conta.documento && <div><span>CPF/CNPJ</span><strong>{p.conta.documento}</strong></div>}
            <div><span>Valor</span><strong>{moeda(p.valorAgora)}</strong></div>
          </div>
        </div>
      )}

      {!p.pix && !p.conta && (
        <div className="alerta aviso">O pagamento será combinado diretamente no local.</div>
      )}

      {p.instrucoes && <div className="instrucoes">ℹ️ {p.instrucoes}</div>}
      <p className="muted pequeno">
        Depois do pagamento o administrador confere e confirma sua reserva como paga.
      </p>
    </div>
  );
}
