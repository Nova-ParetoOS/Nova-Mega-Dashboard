// ============================================================
// hrUtils.js — Sprint 4: Funções Utilitárias de RH
// ============================================================

export const HR_STATUS_OPTIONS = [
  'Banco de Talentos',
  'Em análise',
  'Entrevista agendada',
  'Entrevista realizada',
  'Fase de Teste',
  'Contratado',
  'Recusado',
  'Aguardando retorno',
  'Desistiu',
];

export const HR_FONTE_OPTIONS = [
  'Instagram',
  'Indicação',
  'Indeed',
  'LinkedIn',
  'Vitrine',
  'WhatsApp',
  'Outro',
];

export const HR_MOTIVO_OPTIONS = [
  '—',
  'Não compareceu',
  'Desistiu',
  'Perfil inadequado',
  'Salário incompatível',
  'Sem experiência',
  'Reprovado no teste',
  'Vaga preenchida',
  'Em análise',
  'Aprovado',
];

// ── Campos calculados ─────────────────────────────────────

/**
 * Dias entre recebimento do currículo e data de resposta.
 */
export const diasAteResposta = (cand) => {
  if (!cand.recebimento_curriculo || !cand.data_resposta) return null;
  const a = new Date(cand.recebimento_curriculo);
  const b = new Date(cand.data_resposta);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

/**
 * Dias entre data de resposta e entrevista agendada.
 */
export const diasAteEntrevista = (cand) => {
  if (!cand.data_resposta || !cand.entrevista_agendada) return null;
  const a = new Date(cand.data_resposta);
  const b = new Date(cand.entrevista_agendada);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

/**
 * Gera link WhatsApp com DDI 55.
 */
export const linkWhatsApp = (telefone) => {
  if (!telefone) return null;
  const nums = telefone.replace(/\D/g, '');
  if (!nums) return null;
  const num = nums.startsWith('55') ? nums : '55' + nums;
  return 'https://wa.me/' + num;
};

/**
 * Etapa máxima atingida pelo candidato.
 */
export const etapaMaxima = (status) => {
  if (!status) return '1. Currículo recebido';
  if (status === 'Contratado')                      return '6. Contratado';
  if (status.includes('Teste'))                     return '5. Fase de Teste';
  if (status === 'Entrevista realizada')             return '4. Entrevista realizada';
  if (status === 'Entrevista agendada')              return '3. Entrevista agendada';
  if (status === 'Em análise')                       return '2. Em análise';
  return '1. Currículo recebido';
};

/**
 * Macro status final cruzando status e motivo.
 */
export const macroStatusFinal = (status, motivo) => {
  if (!status) return '—';
  if (status === 'Contratado')                                      return '✅ Contratado';
  if (status === 'Recusado' && motivo === 'Não compareceu')         return '🚫 No-Show';
  if (status === 'Recusado' && motivo === 'Desistiu')               return '🔙 Desistência';
  if (status === 'Recusado' && motivo === 'Perfil inadequado')      return '❌ Perfil Inadequado';
  if (status === 'Recusado' && motivo === 'Salário incompatível')   return '💰 Salário';
  if (status === 'Recusado' && motivo === 'Reprovado no teste')     return '📝 Reprovado';
  if (status === 'Recusado' && motivo === 'Sem experiência')        return '📉 Sem Experiência';
  if (status === 'Recusado')                                        return '❌ Recusado';
  if (status === 'Fase de Teste')                                   return '🧪 Em Teste';
  if (status === 'Entrevista realizada')                            return '🎙️ Entrevistado';
  if (status === 'Entrevista agendada')                             return '📅 Agendado';
  if (status === 'Aguardando retorno')                              return '⏳ Aguardando';
  if (status === 'Desistiu')                                        return '🔙 Desistência';
  if (status === 'Em análise')                                      return '🔍 Em Análise';
  return '📋 ' + status;
};

/**
 * Identifica gargalo no processo.
 */
export const gargaloIdentificado = (cand) => {
  const diasResp = diasAteResposta(cand);
  const diasEnt  = diasAteEntrevista(cand);

  // Sem resposta há mais de 24h
  if (cand.recebimento_curriculo && !cand.data_resposta) {
    const diffHoras = (Date.now() - new Date(cand.recebimento_curriculo).getTime()) / (1000 * 60 * 60);
    if (diffHoras > 24) return 'Atraso no retorno';
  }
  if (diasResp !== null && diasResp > 1)   return 'Resposta lenta';
  if (diasEnt  !== null && diasEnt  > 7)   return 'Entrevista demorada';
  return null;
};

/**
 * Verifica SLA: currículo recebido, sem resposta, >24h.
 */
export const alertaSLA = (cand) => {
  if (!cand.recebimento_curriculo || cand.data_resposta) return false;
  const diff = (Date.now() - new Date(cand.recebimento_curriculo).getTime()) / (1000 * 60 * 60);
  return diff > 24;
};

/**
 * Gatilhos automáticos ao mudar status.
 * Retorna campos a atualizar com base no novo status.
 */
export const gatilhosStatus = (novoStatus, cand) => {
  const hoje = new Date().toISOString().split('T')[0];
  const updates = { status_processo: novoStatus, updated_at: new Date().toISOString() };

  if (novoStatus === 'Entrevista agendada' || novoStatus === 'Entrevista realizada') {
    if (!cand.data_resposta)        updates.data_resposta        = hoje;
    if (!cand.entrevista_agendada)  updates.entrevista_agendada  = hoje;
  }
  if (novoStatus === 'Recusado' || novoStatus === 'Contratado') {
    if (!cand.data_resposta) updates.data_resposta = hoje;
  }
  return updates;
};

/**
 * Cria candidato novo com campos calculados e data automática.
 */
export const novoCandidato = (campos) => {
  const hoje = new Date().toISOString().split('T')[0];
  const cand = {
    recebimento_curriculo: hoje,
    updated_at: new Date().toISOString(),
    ...campos,
  };
  return {
    ...cand,
    etapa_maxima:      etapaMaxima(cand.status_processo),
    macro_status_final: macroStatusFinal(cand.status_processo, cand.motivo_detalhes),
    gargalo:           gargaloIdentificado(cand),
    whatsapp:          cand.telefone ? cand.telefone.replace(/\D/g, '') : null,
  };
};