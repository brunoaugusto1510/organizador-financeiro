/**
 * mock-data.js — Dados de demonstração para as telas ainda sem backend.
 * Cada bloco documenta o CONTRATO que o backend deverá retornar.
 * O time de backend troca o corpo dos stubs em api.js por fetch real,
 * mantendo exatamente estes formatos.
 */
const MOCK = {
  // Backend: GET /api/investments -> { classe, valor, variacaoPct }[]
  // variacaoPct: número (ex. 6.0 = +6%, -3.5 = -3,5%)
  investimentos: [
    { classe: 'Renda fixa',     valor: 20000, variacaoPct: 6.0 },
    { classe: 'Renda variável', valor: 18000, variacaoPct: -3.5 },
    { classe: 'Fundos',         valor: 12000, variacaoPct: 2.1 },
  ],
};
