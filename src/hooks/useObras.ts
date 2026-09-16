import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Obra, ObraFiltros, STATUS_ID_LABELS, extrairAnoDoProcesso } from '../types/obra';

interface UseObrasResult {
  obras: Obra[];
  obrasFiltradas: Obra[];
  categorias: string[];
  regioesTuristicas: { id: number; nome: string }[];
  statusIds: number[];
  carregando: boolean;
  erro: string | null;
}

export function useObras(filtros: ObraFiltros): UseObrasResult {
  const [obras, setObras] = useState<Obra[]>([]);
  const [regioes, setRegioes] = useState<{ id: number; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      setCarregando(true);
      setErro(null);

      try {
        // Buscar todas as regiões turísticas
        const { data: regioesData, error: regioesError } = await supabase
          .from('regioes')
          .select('id, nome')
          .eq('ativo', true);

        if (regioesError) {
          console.error('Erro ao buscar regiões:', regioesError);
        } else if (ativo) {
          setRegioes(regioesData || []);
        }

        // Buscar municípios para criar o mapa municipality_id -> region_id e nomes
        const { data: municipiosData, error: municipiosError } = await supabase
          .from('municipalities')
          .select('id, name, region_id');

        if (municipiosError) {
          console.error('Erro ao buscar municípios:', municipiosError);
        }

        // Criar mapa de município para região e nomes
        const municipalityRegionMap = new Map<number, number>();
        const municipalityNameMap = new Map<number, string>();
        if (municipiosData) {
          municipiosData.forEach(m => {
            if (m.region_id) {
              municipalityRegionMap.set(m.id, m.region_id);
            }
            municipalityNameMap.set(m.id, m.name);
          });
        }

        // Buscar processos com parcelas
        const { data, error } = await supabase
          .from('processes')
          .select('*, total_concedente_value, process_parcels(id, parcel_number, value, payment_date)');

        if (!ativo) return;

        if (error) {
          setErro(error.message);
          setObras([]);
        } else {
          // Enriquecer os dados com região turística e nome do município
          const obrasEnriquecidas = (data || []).map((obra: Obra) => {
            let regionId: number | undefined;
            let regiaoNome: string | undefined;
            
            if (obra.municipality_id && municipalityRegionMap.has(obra.municipality_id)) {
              regionId = municipalityRegionMap.get(obra.municipality_id);
              regiaoNome = regioesData?.find(r => r.id === regionId)?.nome;
            }
            
            const municipioNome = obra.municipality_id ? municipalityNameMap.get(obra.municipality_id) : undefined;
            const statusNome = obra.status_id ? STATUS_ID_LABELS[obra.status_id] || `Status ${obra.status_id}` : undefined;
            
            return {
              ...obra,
              regiao_turistica: regiaoNome || obra.regiao_turistica,
              region_id: regionId,
              municipio_nome: municipioNome,
              status_nome: statusNome
            };
          });
          
          setObras(obrasEnriquecidas as Obra[]);
        }
      } catch (err) {
        if (ativo) {
          setErro('Erro ao carregar dados');
          setObras([]);
        }
      }

      if (ativo) {
        setCarregando(false);
      }
    }

    buscar();
    return () => {
      ativo = false;
    };
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(obras.map((o) => o.categoria).filter((c): c is string => Boolean(c)))),
    [obras]
  );

  const regioesTuristicas = useMemo(
    () => regioes.sort((a, b) => a.nome.localeCompare(b.nome)),
    [regioes]
  );

  const statusIds = useMemo(
    () => Array.from(new Set(obras.map((o) => o.status_id).filter((s): s is number => typeof s === 'number'))).sort((a, b) => a - b),
    [obras]
  );

  const obrasFiltradas = useMemo(() => {
    const agora = new Date();
    const em30Dias = new Date();
    em30Dias.setDate(agora.getDate() + 30);

    return obras.filter((obra) => {
      // Filtro de status_id
      if (filtros.statusId.length > 0 && obra.status_id && !filtros.statusId.includes(obra.status_id)) {
        return false;
      }

      // Filtro de categoria
      if (
        filtros.categoria.length > 0 &&
        obra.categoria &&
        !filtros.categoria.includes(obra.categoria)
      ) {
        return false;
      }

      // Filtro de região turística (agora por region_id)
      if (
        filtros.regiaoTuristica.length > 0 &&
        (!obra.region_id || !filtros.regiaoTuristica.includes(obra.region_id))
      ) {
        return false;
      }

      // Filtro de busca - verifica object e process_number
      if (filtros.busca.trim()) {
        const termo = filtros.busca.trim().toLowerCase();
        let encontrado = false;
        
        if (obra.object) {
          encontrado = obra.object.toLowerCase().includes(termo);
        }
        if (!encontrado && obra.process_number) {
          encontrado = obra.process_number.toLowerCase().includes(termo);
        }
        
        if (!encontrado) return false;
      }

      // Filtro de valor mínimo
      if (filtros.valorMin !== null && obra.total_portaria_value !== null && obra.total_portaria_value !== undefined && obra.total_portaria_value < filtros.valorMin) {
        return false;
      }

      // Filtro de valor máximo
      if (filtros.valorMax !== null && obra.total_portaria_value !== null && obra.total_portaria_value !== undefined && obra.total_portaria_value > filtros.valorMax) {
        return false;
      }

      // Filtro de vencimento em 30 dias (baseado em vigencia_date ou data_prestacao_contas)
      if (filtros.apenasVencendoEm30Dias) {
        const dataVencimento = obra.vigencia_date || obra.data_prestacao_contas;
        if (dataVencimento) {
          const vencimento = new Date(dataVencimento);
          if (vencimento < agora || vencimento > em30Dias) return false;
        } else {
          return false; // Se não tem data de vencimento, não inclui no filtro
        }
      }

      // Filtro de contratos assinados
      if (filtros.apenasContratosAssinados && !obra.contrato_assinado) {
        return false;
      }

      // Filtro de ano (extraído do process_number)
      if (filtros.ano !== null) {
        const anoProcesso = extrairAnoDoProcesso(obra.process_number);
        if (anoProcesso !== filtros.ano) {
          return false;
        }
      }

      return true;
    });
  }, [obras, filtros]);

  return { obras, obrasFiltradas, categorias, regioesTuristicas, statusIds, carregando, erro };
}
