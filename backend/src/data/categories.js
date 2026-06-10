// Taxonomia canônica de categorias (estilo Nubank).
// Cada item é uma SUBcategoria; `group` é o slug do grupo-pai.
// Fonte de verdade do seed e dos testes. Estilo (cor/ícone do grupo) vive no front.
export const CATEGORIAS_PADRAO = [
  // Alimentação
  { slug: 'supermercado',  name: 'Supermercado',  type: 'expense', icon: '🛒', group: 'alimentacao' },
  { slug: 'restaurantes',  name: 'Restaurantes',  type: 'expense', icon: '🍴', group: 'alimentacao' },
  { slug: 'delivery',      name: 'Delivery',      type: 'expense', icon: '🛵', group: 'alimentacao' },
  { slug: 'padaria',       name: 'Padaria',       type: 'expense', icon: '🥖', group: 'alimentacao' },
  { slug: 'cafeteria',     name: 'Cafeteria',     type: 'expense', icon: '☕', group: 'alimentacao' },
  // Transporte
  { slug: 'combustivel',        name: 'Combustível',         type: 'expense', icon: '⛽', group: 'transporte' },
  { slug: 'app_transporte',     name: 'App de transporte',   type: 'expense', icon: '🚕', group: 'transporte' },
  { slug: 'transporte_publico', name: 'Transporte público',  type: 'expense', icon: '🚌', group: 'transporte' },
  { slug: 'estacionamento',     name: 'Estacionamento',      type: 'expense', icon: '🅿️', group: 'transporte' },
  { slug: 'manutencao_veiculo', name: 'Manutenção',          type: 'expense', icon: '🔧', group: 'transporte' },
  // Moradia
  { slug: 'aluguel',     name: 'Aluguel',      type: 'expense', icon: '🏠', group: 'moradia' },
  { slug: 'condominio',  name: 'Condomínio',   type: 'expense', icon: '🏢', group: 'moradia' },
  { slug: 'energia',     name: 'Energia',      type: 'expense', icon: '💡', group: 'moradia' },
  { slug: 'agua',        name: 'Água',         type: 'expense', icon: '🚰', group: 'moradia' },
  { slug: 'internet_tv', name: 'Internet/TV',  type: 'expense', icon: '📶', group: 'moradia' },
  { slug: 'gas',         name: 'Gás',          type: 'expense', icon: '🔥', group: 'moradia' },
  // Saúde e bem-estar
  { slug: 'farmacia',         name: 'Farmácia',                    type: 'expense', icon: '💊', group: 'saude' },
  { slug: 'consultas_exames', name: 'Consultas e exames',          type: 'expense', icon: '🩺', group: 'saude' },
  { slug: 'plano_saude',      name: 'Plano de saúde',              type: 'expense', icon: '🏥', group: 'saude' },
  { slug: 'academia_lazer',   name: 'Academia e centros de lazer', type: 'expense', icon: '🏋️', group: 'saude' },
  // Compras
  { slug: 'compras',        name: 'Compras',           type: 'expense', icon: '🛍️', group: 'compras' },
  { slug: 'eletronicos',    name: 'Eletrônicos',       type: 'expense', icon: '📱', group: 'compras' },
  { slug: 'vestuario',      name: 'Vestuário',         type: 'expense', icon: '👕', group: 'compras' },
  { slug: 'livraria',       name: 'Livraria',          type: 'expense', icon: '📚', group: 'compras' },
  { slug: 'casa_decoracao', name: 'Casa e decoração',  type: 'expense', icon: '🛋️', group: 'compras' },
  // Lazer
  { slug: 'streaming',     name: 'Streaming',        type: 'expense', icon: '📺', group: 'lazer' },
  { slug: 'cinema_teatro', name: 'Cinema e teatro',  type: 'expense', icon: '🎬', group: 'lazer' },
  { slug: 'viagens',       name: 'Viagens',          type: 'expense', icon: '✈️', group: 'lazer' },
  { slug: 'jogos',         name: 'Jogos',            type: 'expense', icon: '🎮', group: 'lazer' },
  { slug: 'bares_baladas', name: 'Bares e baladas',  type: 'expense', icon: '🍻', group: 'lazer' },
  // Educação
  { slug: 'cursos',              name: 'Cursos',            type: 'expense', icon: '🎓', group: 'educacao' },
  { slug: 'mensalidade_escolar', name: 'Mensalidade',       type: 'expense', icon: '🏫', group: 'educacao' },
  { slug: 'material_escolar',    name: 'Material escolar',  type: 'expense', icon: '✏️', group: 'educacao' },
  // Finanças
  { slug: 'transferencias',            name: 'Transferências',              type: 'expense', icon: '💸', group: 'financas' },
  { slug: 'emprestimos_financiamento', name: 'Empréstimos e financiamento', type: 'expense', icon: '🏦', group: 'financas' },
  { slug: 'tarifas_bancarias',         name: 'Tarifas bancárias',           type: 'expense', icon: '🧾', group: 'financas' },
  { slug: 'impostos',                  name: 'Impostos',                    type: 'expense', icon: '🧮', group: 'financas' },
  // Serviços
  { slug: 'servicos',      name: 'Serviços',      type: 'expense', icon: '🧰', group: 'servicos' },
  { slug: 'assinaturas',   name: 'Assinaturas',   type: 'expense', icon: '🔁', group: 'servicos' },
  { slug: 'profissionais', name: 'Profissionais', type: 'expense', icon: '👔', group: 'servicos' },
  // Outros
  { slug: 'outros', name: 'Outros', type: 'expense', icon: '📦', group: 'outros' },
  // Renda
  { slug: 'salario',              name: 'Salário',              type: 'income', icon: '💰', group: 'renda' },
  { slug: 'renda_extra',          name: 'Renda extra',          type: 'income', icon: '💵', group: 'renda' },
  { slug: 'renda_nao_recorrente', name: 'Renda não-recorrente', type: 'income', icon: '🎁', group: 'renda' },
  { slug: 'rendimentos',          name: 'Rendimentos',          type: 'income', icon: '📈', group: 'renda' },
];
