export type StatusObra = 'planejada' | 'em_andamento' | 'concluida' | 'paralisada';

export type TipoPonto = 'obra' | 'evento';

export interface Obra {
  [key: string]: any; // Permite qualquer propriedade da tabela processes
  id?: number;
  object?: string; // Descrição da obra (antigo "nome")
  process_number?: string;
  portaria_number?: string;
  total_portaria_value?: number;
  licitado_value?: number;
  status_id?: number;
  status_nome?: string; // Nome do status (enriquecido)
  municipality_id?: number;
  municipio_nome?: string; // Nome do município (enriquecido)
  regiao_turistica?: string | null;
  region_id?: number; // ID da região turística (baseado no município)
  categoria?: string | null;
  tipo_de_repasse?: string | null;
  contrato_assinado?: boolean;
  latitude?: number;
  longitude?: number;
  link_plataforma_governo?: string;
  created_at?: string;
  updated_at?: string;
  vigencia_date?: string | null;
  data_prestacao_contas?: string | null;
}

export interface MedicaoObra {
  parcela: number;
  valor: number | null;
  status: string | null;
  image_url: string | null;
  percentual: number | null;
  data_foto: string | null;
}

export interface DetalhesObraImagens {
  imagemPrincipalUrl: string | null;
  medicoes: MedicaoObra[];
}

export interface ObraFiltros {
  categoria: string[];
  regiaoTuristica: number[]; // Agora são IDs de regiões
  statusId: number[];
  busca: string;
  valorMin: number | null;
  valorMax: number | null;
  apenasVencendoEm30Dias: boolean;
  apenasContratosAssinados: boolean;
}

export const filtrosVazios: ObraFiltros = {
  categoria: [],
  regiaoTuristica: [],
  statusId: [],
  busca: '',
  valorMin: null,
  valorMax: null,
  apenasVencendoEm30Dias: false,
  apenasContratosAssinados: false,
};

// Labels para status_id baseados nos valores encontrados no banco
export const STATUS_ID_LABELS: Record<number, string> = {
  2: 'Em análise',
  3: 'Aprovado',
  4: 'Em andamento',
  5: 'Concluído',
  6: 'Cancelado',
  7: 'Suspenso',
  8: 'Pendente',
  19: 'Outro',
};

export const STATUS_LABELS: Record<StatusObra, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  paralisada: 'Paralisada',
};

export const STATUS_CORES: Record<StatusObra, string> = {
  planejada: '#6B7280',     // cinza
  em_andamento: '#D97706',  // âmbar
  concluida: '#059669',     // verde
  paralisada: '#DC2626',    // vermelho
};
