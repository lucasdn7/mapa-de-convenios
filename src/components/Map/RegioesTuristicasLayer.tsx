import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Path } from 'leaflet';
import { supabase } from '../../lib/supabase';
import { CORES_REGIOES } from '../../constants/regioes';

type MunicipioProperties = {
  NOME?: string;
  NOME_MUN?: string;
  NM_MUN?: string;
  [key: string]: unknown;
};

type MunicipioFeature = Feature<Geometry, MunicipioProperties>;
type MunicipiosData = FeatureCollection<Geometry, MunicipioProperties>;

interface RegioesTuristicasLayerProps {
  regiaoDestacada: string | null;
  onRegiaoClick: (regiao: string | null) => void;
}

export function RegioesTuristicasLayer({ regiaoDestacada, onRegiaoClick }: RegioesTuristicasLayerProps) {
  const [dados, setDados] = useState<MunicipiosData | null>(null);
  const [municipioRegiaoMap, setMunicipioRegiaoMap] = useState<Map<string, string>>(new Map());
  const [regioesData, setRegioesData] = useState<{ id: number; nome: string }[]>([]);

  useEffect(() => {
    // Carregar dados das regiões e municípios
    async function carregarDados() {
      try {
        // Buscar regiões turísticas do Supabase (15 regiões)
        const { data: regioes } = await supabase
          .from('regioes')
          .select('id, nome')
          .eq('ativo', true);

        if (regioes) {
          setRegioesData(regioes);
        }

        // Carregar CSV de municípios por região
        const response = await fetch('/municipios_por_igr.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n').slice(1); // Pular cabeçalho
        
        // Criar conjunto de nomes de regiões válidas (do Supabase)
        const regioesValidas = new Set(regioes?.map(r => r.nome) || []);
        
        // Criar mapeamento de sinônimos de regiões para normalizar nomes do CSV
        const regiaoSinonimos: Record<string, string> = {
          'Caminho dos Cânions': 'Caminho dos Canyons', // CSV com acento -> Supabase sem acento
          'Vale do Contestado': 'Caminhos do Contestado', // Sinônimo conhecido
        };
        
        // Criar mapeamento de normalização de nomes de municípios (CSV -> GeoJSON)
        const municipioSinonimos: Record<string, string> = {
          'presidente castello branco': 'presidente castelo branco', // Castello -> Castelo
        };
        
        // Criar mapa nome_municipio -> nome_regiao (apenas para regiões válidas)
        const mapa = new Map<string, string>();
        
        lines.forEach(line => {
          if (!line.trim()) return;
          
          // Parsing CSV - pegar as 2 primeiras colunas
          const firstComma = line.indexOf(',');
          const secondComma = line.indexOf(',', firstComma + 1);
          
          if (firstComma > 0) {
            let regiaoNome = line.substring(0, firstComma).trim();
            let municipioNome = line.substring(firstComma + 1, secondComma > 0 ? secondComma : line.length).trim().toLowerCase();
            
            // Normalizar nome da região usando sinônimos
            if (regiaoSinonimos[regiaoNome]) {
              regiaoNome = regiaoSinonimos[regiaoNome];
            }
            
            // Normalizar nome do município usando sinônimos
            if (municipioSinonimos[municipioNome]) {
              municipioNome = municipioSinonimos[municipioNome];
            }
            
            // Apenas mapear se a região for válida (está no Supabase)
            if (regiaoNome && municipioNome && regioesValidas.has(regiaoNome)) {
              mapa.set(municipioNome, regiaoNome);
            }
          }
        });
        

        
        setMunicipioRegiaoMap(mapa);
      } catch (error) {
        console.error('Erro ao carregar dados de regiões:', error);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/geo/municipios-sc.geojson', { signal: controller.signal })
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error(`Não foi possível carregar os municípios (${resposta.status}).`);
        }
        return resposta.json() as Promise<MunicipiosData>;
      })
      .then((dados) => {
        setDados(dados);
      })
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === 'AbortError') return;
        console.error('Erro ao carregar a camada de municípios:', erro);
      });

    return () => controller.abort();
  }, []);

  if (!dados) return null;

  function obterNome(feature: MunicipioFeature) {
    const nome = String(
      feature.properties?.NOME_MUN ??
        feature.properties?.NM_MUN ??
        feature.properties?.NOME ??
        'Município'
    ).trim();
    
    // Normalizar nome para corresponder ao CSV (Castelo -> Castello)
    const normalizacoes: Record<string, string> = {
      'presidente castelo branco': 'presidente castello branco',
    };
    
    const nomeNormalizado = nome.toLowerCase();
    return normalizacoes[nomeNormalizado] || nomeNormalizado;
  }

  function obterCorMunicipio(nomeMunicipio: string): string {
    const nomeNormalizado = nomeMunicipio.toLowerCase();
    const regiao = municipioRegiaoMap.get(nomeNormalizado);
    
    // Usar o nome exato da região do CSV (com acentos corretos)
    if (regiao) {
      return CORES_REGIOES[regiao] || '#CCCCCC';
    }
    
    return '#CCCCCC';
  }

  function obterEstilo(feature?: MunicipioFeature) {
    if (!feature) {
      return {
        color: '#CCCCCC',
        weight: 1,
        opacity: 0.85,
        fillColor: '#CCCCCC',
        fillOpacity: 0.7,
      };
    }
    
    const nome = obterNome(feature);
    const cor = obterCorMunicipio(nome);
    
    return {
      color: cor,
      weight: 1,
      opacity: 0.85,
      fillColor: cor,
      fillOpacity: 0.7,
    };
  }

  const aoCriarCamada = (feature: MunicipioFeature, layer: Path) => {
    const nome = obterNome(feature);
    const regiao = municipioRegiaoMap.get(nome.toLowerCase());
    const corOriginal = obterCorMunicipio(nome);
    
    layer.bindTooltip(
      regiao ? `${nome}<br/><small>${regiao}</small>` : nome,
      { sticky: true }
    );

    // Aplicar estilo inicial sem eventos de hover que alteram cor
    layer.setStyle({
      color: corOriginal,
      weight: 1,
      opacity: 0.85,
      fillColor: corOriginal,
      fillOpacity: 0.7,
    });

    layer.on({
      click: (evento) => {
        if (regiao) {
          onRegiaoClick(regiaoDestacada === regiao ? null : regiao);
        }
        L.DomEvent.stopPropagation(evento);
      },
    });
  };

  return (
    <GeoJSON
      data={dados}
      style={obterEstilo}
      onEachFeature={aoCriarCamada}
    />
  );
}