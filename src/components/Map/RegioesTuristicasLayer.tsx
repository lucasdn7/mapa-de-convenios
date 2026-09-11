import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Layer } from 'leaflet';
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
    // Carregar dados das regiões e municípios usando CSV
    async function carregarDados() {
      try {
        // Buscar regiões turísticas do Supabase
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
        
        // Criar mapa nome_municipio -> nome_regiao
        const mapa = new Map<string, string>();
        lines.forEach(line => {
          if (!line.trim()) return;
          
          // Parsing simples: primeira coluna é região, segunda é município
          const parts = line.split(',');
          if (parts.length >= 2) {
            const regiaoNome = parts[0].trim();
            const municipioNome = parts[1].trim().toLowerCase();
            
            if (regiaoNome && municipioNome) {
              // Usar o nome exato da região do CSV
              mapa.set(municipioNome, regiaoNome);
            }
          }
        });
        
        setMunicipioRegiaoMap(mapa);
        console.log('Mapeamento CSV carregado:', mapa.size, 'municípios');
        console.log('Exemplo de mapeamento:', Array.from(mapa.entries()).slice(0, 5));
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
      .then(setDados)
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === 'AbortError') return;
        console.error('Erro ao carregar a camada de municípios:', erro);
      });

    return () => controller.abort();
  }, []);

  if (!dados) return null;

  function obterNome(feature: MunicipioFeature) {
    return String(
      feature.properties?.NOME_MUN ??
        feature.properties?.NM_MUN ??
        feature.properties?.NOME ??
        'Município'
    ).trim();
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

  function obterEstilo(feature: MunicipioFeature) {
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

  const aoCriarCamada = (feature: MunicipioFeature, layer: Layer) => {
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