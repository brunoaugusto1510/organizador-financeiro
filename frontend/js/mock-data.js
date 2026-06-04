/**
 * mock-data.js — Dados de demonstração para as telas ainda sem backend.
 * Cada bloco documenta o CONTRATO que o backend deverá retornar.
 * O time de backend troca o corpo dos stubs em api.js por fetch real,
 * mantendo exatamente estes formatos.
 */
const MOCK = {
  // Backend: GET /api/banks -> { id, nome, saldo }[]
  bancos: [
    { id: 'b1', nome: 'PicPay',    saldo: 120.00 },
    { id: 'b2', nome: 'BTG Pactual', saldo: 1450.00 },
    { id: 'b3', nome: 'Santander', saldo: 130.00 },
  ],

  // Backend: GET /api/investments -> { classe, valor, variacaoPct }[]
  // variacaoPct: número (ex. 6.0 = +6%, -3.5 = -3,5%)
  investimentos: [
    { classe: 'Renda fixa',     valor: 20000, variacaoPct: 6.0 },
    { classe: 'Renda variável', valor: 18000, variacaoPct: -3.5 },
    { classe: 'Fundos',         valor: 12000, variacaoPct: 2.1 },
  ],

  // Backend: GET /api/subscriptions -> { nome, valor, proximaCobranca }[]
  // proximaCobranca: data ISO 'YYYY-MM-DD'
  assinaturas: [
    { nome: 'Spotify', valor: 21.90, proximaCobranca: '2026-06-16' },
    { nome: 'Netflix', valor: 39.90, proximaCobranca: '2026-06-26' },
    { nome: 'Amazon Prime', valor: 14.90, proximaCobranca: '2026-06-24' },
  ],

  // Backend: POST /api/chat { mensagem } -> { resposta }
  respostaChat(mensagem) {
    const texto = String(mensagem).toLowerCase();
    if (texto.includes('plano')) return 'Posso montar um plano: separe 50% para essenciais, 30% para desejos e 20% para poupança. Quer que eu detalhe com base nos seus gastos?';
    if (texto.includes('grana') || texto.includes('apertado')) return 'Entendi. Vejo que suas saídas estão altas este mês. Que tal revisar as assinaturas? Você tem 3 ativas somando R$ 76,70/mês.';
    return 'Sou seu assistente financeiro. (Resposta de demonstração — a IA real será conectada pelo backend.)';
  },
};
