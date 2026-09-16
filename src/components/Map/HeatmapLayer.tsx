import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Path } from 'leaflet';
import { supabase } from '../../lib/supabase';

type MunicipioProperties = {
  NOME?: string;
  NOME_MUN?: string;
  NM_MUN?: string;
  [key: string]: unknown;
};

type MunicipioFeature = Feature<Geometry, MunicipioProperties>;
type MunicipiosData = FeatureCollection<Geometry, MunicipioProperties>;

type HeatmapTipo = 'investimento' | 'execucao' | 'risco' | 'fluxo_caixa' | 'densidade';

interface RegiaoHeatmapData {
  regiao_id: number;
  regiao_nome: string;
  valor_total: number;
  total_processos: number;
  valor_medio: number;
  cor: string;
  percentual: number;
  percentual_execucao?: number;
  parcelas_pagas?: number;
  total_parcelas?: number;
}

interface MunicipioHeatmapData {
  municipio_id: number;
  municipio_nome: string;
  valor_total: number;
  total_processos: number;
  valor_medio: number;
  cor: string;
  percentual: number;
  percentual_execucao?: number;
  parcelas_pagas?: number;
  total_parcelas?: number;
}

interface HeatmapLayerProps {
  ano: number | null;
  tipo: HeatmapTipo;
  nivel: 'regiao' | 'municipio';
  onRegiaoClick?: (regiaoNome: string) => void;
  onMunicipioClick?: (municipioNome: string) => void;
  onMaxValorChange?: (maxValor: number) => void;
}

export function HeatmapLayer({ ano, tipo, nivel, onRegiaoClick, onMunicipioClick, onMaxValorChange }: HeatmapLayerProps) {
  const [dados, setDados] = useState<MunicipiosData | null>(null);
  const [municipioRegiaoMap, setMunicipioRegiaoMap] = useState<Map<string, number>>(new Map());
  const [municipioDataMap, setMunicipioDataMap] = useState<Map<string, MunicipioHeatmapData>>(new Map());
  const [heatmapData, setHeatmapData] = useState<RegiaoHeatmapData[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Cores do heatmap - Vermelho = mais gasto/obras, Azul = menos gasto/obras
  const CORES_HEATMAP = {
    baixo: '#3498DB',    // Azul - menos gasto/obras
    medio: '#27AE60',    // Verde
    alto: '#E67E22',     // Laranja
    muitoAlto: '#E74C3C' // Vermelho - mais gasto/obras
  };

  useEffect(() => {
    // Carregar dados do heatmap do Supabase
    async function carregarHeatmapData() {
      setCarregando(true);
      try {
        // Buscar municípios para mapear para regiões
        const { data: municipalities } = await supabase
          .from('municipalities')
          .select('id, name, region_id');

        // Buscar regiões
        const { data: regioes } = await supabase
          .from('regioes')
          .select('id, nome')
          .eq('ativo', true);

        // Criar mapa municipio_id -> region_id
        const municipioRegionMap = new Map<number, number>();
        municipalities?.forEach(m => {
          if (m.region_id) {
            municipioRegionMap.set(m.id, m.region_id);
          }
        });

        // Criar mapa municipio_id -> nome
        const municipioNomeMap = new Map<number, string>();
        municipalities?.forEach(m => {
          municipioNomeMap.set(m.id, m.name);
        });

        let processes, error;
        
        // Se houver filtro de ano, filtrar por ano
        if (ano) {
          // Precisamos buscar process_number para extrair o ano
          const { data: processesComAno } = await supabase
            .from('processes')
            .select('id, municipality_id, total_concedente_value, total_portaria_value, process_number');
          
          if (processesComAno) {
            const processosFiltrados = processesComAno.filter(p => {
              const match = p.process_number?.match(/\/(\d{4})$/);
              if (match) {
                return parseInt(match[1], 10) === ano;
              }
              return false;
            });
            
            processes = processosFiltrados;
            error = null;
          }
        } else {
          const result = await supabase
            .from('processes')
            .select('municipality_id, total_concedente_value, total_portaria_value');
          processes = result.data;
          error = result.error;
        }

        if (error) {
          console.error('Erro ao carregar dados do heatmap:', error);
          return;
        }

        // Buscar parcelas para cálculo de execução
        let parcelasMap = new Map<number, { pagas: number; total: number; valor_pago: number }>();
        
        if (tipo === 'execucao') {
          const { data: parcelas } = await supabase
            .from('process_parcels')
            .select('process_id, value, payment_date');
          
          parcelas?.forEach(pp => {
            const current = parcelasMap.get(pp.process_id) || { pagas: 0, total: 0, valor_pago: 0 };
            parcelasMap.set(pp.process_id, {
              pagas: current.pagas + (pp.payment_date ? 1 : 0),
              total: current.total + 1,
              valor_pago: current.valor_pago + (pp.payment_date ? (pp.value || 0) : 0)
            });
          });
        }

        // Calcular dados baseados no tipo e nível
        if (nivel === 'regiao') {
          if (tipo === 'investimento') {
            // Calcular valor total por região usando total_concedente_value
            const regiaoValorMap = new Map<number, { valor: number; count: number }>();
            
            processes?.forEach(p => {
              if (p.municipality_id && municipioRegionMap.has(p.municipality_id)) {
                const regionId = municipioRegionMap.get(p.municipality_id)!;
                const current = regiaoValorMap.get(regionId) || { valor: 0, count: 0 };
                regiaoValorMap.set(regionId, {
                  valor: current.valor + (p.total_concedente_value || 0),
                  count: current.count + 1
                });
              }
            });

            // Encontrar valor máximo
            const valores = Array.from(regiaoValorMap.values()).map(v => v.valor);
            const maxValor = Math.max(...valores, 0);
            
            // Notificar o componente pai sobre o valor máximo
            if (onMaxValorChange) {
              onMaxValorChange(maxValor);
            }

            // Calcular cores para cada região
            const heatmapCalculado: RegiaoHeatmapData[] = regioes?.map(regiao => {
              const dados = regiaoValorMap.get(regiao.id) || { valor: 0, count: 0 };
              const percentual = maxValor > 0 ? (dados.valor / maxValor) * 100 : 0;
              
              let cor: string;
              if (percentual <= 20) {
                cor = CORES_HEATMAP.baixo;
              } else if (percentual <= 50) {
                cor = CORES_HEATMAP.medio;
              } else if (percentual <= 80) {
                cor = CORES_HEATMAP.alto;
              } else {
                cor = CORES_HEATMAP.muitoAlto;
              }

              return {
                regiao_id: regiao.id,
                regiao_nome: regiao.nome,
                valor_total: dados.valor,
                total_processos: dados.count,
                valor_medio: dados.count > 0 ? dados.valor / dados.count : 0,
                cor,
                percentual
              };
            }) || [];

            setHeatmapData(heatmapCalculado);
          } else if (tipo === 'densidade') {
            // Calcular densidade (número de processos) por região
            const regiaoDensidadeMap = new Map<number, { count: number; municipios: Set<number> }>();
            
            processes?.forEach(p => {
              if (p.municipality_id && municipioRegionMap.has(p.municipality_id)) {
                const regionId = municipioRegionMap.get(p.municipality_id)!;
                const current = regiaoDensidadeMap.get(regionId) || { count: 0, municipios: new Set() };
                current.count++;
                current.municipios.add(p.municipality_id);
                regiaoDensidadeMap.set(regionId, current);
              }
            });

            // Encontrar valor máximo
            const valores = Array.from(regiaoDensidadeMap.values()).map(v => v.count);
            const maxValor = Math.max(...valores, 0);

            // Calcular cores para cada região
            const heatmapCalculado: RegiaoHeatmapData[] = regioes?.map(regiao => {
              const dados = regiaoDensidadeMap.get(regiao.id) || { count: 0, municipios: new Set() };
              const percentual = maxValor > 0 ? (dados.count / maxValor) * 100 : 0;
              
              let cor: string;
              if (dados.count < 10) {
                cor = CORES_HEATMAP.baixo;
              } else if (dados.count < 30) {
                cor = CORES_HEATMAP.medio;
              } else if (dados.count < 50) {
                cor = CORES_HEATMAP.alto;
              } else {
                cor = CORES_HEATMAP.muitoAlto;
              }

              return {
                regiao_id: regiao.id,
                regiao_nome: regiao.nome,
                valor_total: dados.count,
                total_processos: dados.count,
                valor_medio: dados.municipios.size > 0 ? dados.count / dados.municipios.size : 0,
                cor,
                percentual
              };
            }) || [];

            setHeatmapData(heatmapCalculado);
          }

          // Criar mapa nome_municipio -> region_id
          const mapa = new Map<string, number>();
          municipalities?.forEach(m => {
            if (m.region_id) {
              mapa.set(m.name.toLowerCase(), m.region_id);
            }
          });
          
          setMunicipioRegiaoMap(mapa);
        } else {
          // Nível município - calcular dados por município
          if (tipo === 'investimento') {
            const municipioValorMap = new Map<number, { valor: number; count: number }>();
            
            processes?.forEach(p => {
              if (p.municipality_id) {
                const current = municipioValorMap.get(p.municipality_id) || { valor: 0, count: 0 };
                municipioValorMap.set(p.municipality_id, {
                  valor: current.valor + (p.total_concedente_value || 0),
                  count: current.count + 1
                });
              }
            });

            // Encontrar valor máximo (escala menor para municípios)
            const valores = Array.from(municipioValorMap.values()).map(v => v.valor);
            const maxValor = Math.max(...valores, 0);
            
            // Notificar o componente pai sobre o valor máximo
            if (onMaxValorChange) {
              onMaxValorChange(maxValor);
            }

            // Calcular cores para cada município
            const municipioDataCalculado = new Map<string, MunicipioHeatmapData>();
            
            municipalities?.forEach(m => {
              const dados = municipioValorMap.get(m.id) || { valor: 0, count: 0 };
              const percentual = maxValor > 0 ? (dados.valor / maxValor) * 100 : 0;
              
              let cor: string;
              if (percentual <= 20) {
                cor = CORES_HEATMAP.baixo;
              } else if (percentual <= 50) {
                cor = CORES_HEATMAP.medio;
              } else if (percentual <= 80) {
                cor = CORES_HEATMAP.alto;
              } else {
                cor = CORES_HEATMAP.muitoAlto;
              }

              municipioDataCalculado.set(m.name.toLowerCase(), {
                municipio_id: m.id,
                municipio_nome: m.name,
                valor_total: dados.valor,
                total_processos: dados.count,
                valor_medio: dados.count > 0 ? dados.valor / dados.count : 0,
                cor,
                percentual
              });
            });

            setMunicipioDataMap(municipioDataCalculado);
          } else if (tipo === 'densidade') {
            const municipioDensidadeMap = new Map<number, { count: number }>();
            
            processes?.forEach(p => {
              if (p.municipality_id) {
                const current = municipioDensidadeMap.get(p.municipality_id) || { count: 0 };
                municipioDensidadeMap.set(p.municipality_id, {
                  count: current.count + 1
                });
              }
            });

            // Encontrar valor máximo
            const valores = Array.from(municipioDensidadeMap.values()).map(v => v.count);
            const maxValor = Math.max(...valores, 0);

            // Calcular cores para cada município
            const municipioDataCalculado = new Map<string, MunicipioHeatmapData>();
            
            municipalities?.forEach(m => {
              const dados = municipioDensidadeMap.get(m.id) || { count: 0 };
              const percentual = maxValor > 0 ? (dados.count / maxValor) * 100 : 0;
              
              let cor: string;
              if (dados.count < 5) {
                cor = CORES_HEATMAP.baixo;
              } else if (dados.count < 10) {
                cor = CORES_HEATMAP.medio;
              } else if (dados.count < 20) {
                cor = CORES_HEATMAP.alto;
              } else {
                cor = CORES_HEATMAP.muitoAlto;
              }

              municipioDataCalculado.set(m.name.toLowerCase(), {
                municipio_id: m.id,
                municipio_nome: m.name,
                valor_total: dados.count,
                total_processos: dados.count,
                valor_medio: dados.count,
                cor,
                percentual
              });
            });

            setMunicipioDataMap(municipioDataCalculado);
          } else if (tipo === 'risco') {
            const municipioRiscoMap = new Map<number, { valor_total: number; count: number; valor_medio: number }>();
            
            processes?.forEach(p => {
              if (p.municipality_id) {
                const current = municipioRiscoMap.get(p.municipality_id) || { valor_total: 0, count: 0, valor_medio: 0 };
                municipioRiscoMap.set(p.municipality_id, {
                  valor_total: current.valor_total + (p.total_concedente_value || 0),
                  count: current.count + 1,
                  valor_medio: 0
                });
              }
            });

            // Calcular valor médio para cada município
            municipioRiscoMap.forEach((dados, municipioId) => {
              if (dados.count > 0) {
                dados.valor_medio = dados.valor_total / dados.count;
              }
            });

            // Encontrar valor médio máximo
            const valores = Array.from(municipioRiscoMap.values()).map(v => v.valor_medio);
            const maxValor = Math.max(...valores, 0);

            // Calcular cores para cada município
            const municipioDataCalculado = new Map<string, MunicipioHeatmapData>();
            
            municipalities?.forEach(m => {
              const dados = municipioRiscoMap.get(m.id) || { valor_total: 0, count: 0, valor_medio: 0 };
              const percentual = maxValor > 0 ? (dados.valor_medio / maxValor) * 100 : 0;
              
              let cor: string;
              if (percentual <= 20) {
                cor = CORES_HEATMAP.baixo;
              } else if (percentual <= 50) {
                cor = CORES_HEATMAP.medio;
              } else if (percentual <= 80) {
                cor = CORES_HEATMAP.alto;
              } else {
                cor = CORES_HEATMAP.muitoAlto;
              }

              municipioDataCalculado.set(m.name.toLowerCase(), {
                municipio_id: m.id,
                municipio_nome: m.name,
                valor_total: dados.valor_medio,
                total_processos: dados.count,
                valor_medio: dados.valor_medio,
                cor,
                percentual
              });
            });

            setMunicipioDataMap(municipioDataCalculado);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados do heatmap:', error);
      } finally {
        setCarregando(false);
      }
    }

    carregarHeatmapData();
  }, [ano, tipo, nivel]);

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

  if (!dados || carregando) return null;

  function obterNome(feature: MunicipioFeature) {
    const nome = String(
      feature.properties?.NOME_MUN ??
        feature.properties?.NM_MUN ??
        feature.properties?.NOME ??
        'Município'
    ).trim();
    
    return nome.toLowerCase();
  }

  function obterCorHeatmap(nomeMunicipio: string): string {
    if (nivel === 'municipio') {
      const municipioData = municipioDataMap.get(nomeMunicipio);
      return municipioData?.cor || '#CCCCCC';
    } else {
      const regionId = municipioRegiaoMap.get(nomeMunicipio);
      
      if (regionId) {
        const regiaoData = heatmapData.find(r => r.regiao_id === regionId);
        return regiaoData?.cor || '#CCCCCC';
      }
      
      return '#CCCCCC';
    }
  }

  function obterDadosRegiao(nomeMunicipio: string): RegiaoHeatmapData | null {
    const regionId = municipioRegiaoMap.get(nomeMunicipio);
    
    if (regionId) {
      return heatmapData.find(r => r.regiao_id === regionId) || null;
    }
    
    return null;
  }

  function obterDadosMunicipio(nomeMunicipio: string): MunicipioHeatmapData | null {
    return municipioDataMap.get(nomeMunicipio) || null;
  }

  function obterEstilo(feature?: MunicipioFeature) {
    if (!feature) {
      return {
        color: '#333',
        weight: 1,
        opacity: 0.5,
        fillColor: '#CCCCCC',
        fillOpacity: 0.6,
      };
    }
    
    const nome = obterNome(feature);
    const cor = obterCorHeatmap(nome);
    
    return {
      color: '#333',
      weight: 1,
      opacity: 0.5,
      fillColor: cor,
      fillOpacity: 0.6,
    };
  }

  const aoCriarCamada = (feature: MunicipioFeature, layer: Path) => {
    const nome = obterNome(feature);
    const corOriginal = obterCorHeatmap(nome);
    
    let tooltipContent = '';
    
    if (nivel === 'municipio') {
      const municipioData = obterDadosMunicipio(nome);
      const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);
      
      if (municipioData) {
        if (tipo === 'investimento') {
          tooltipContent = `
            <div style="font-size: 12px;">
              <strong>${nomeFormatado}</strong><br/>
              Valor Total: R$ ${municipioData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br/>
              Processos: ${municipioData.total_processos}<br/>
              Valor Médio: R$ ${municipioData.valor_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br/>
              % do Estado: ${municipioData.percentual.toFixed(1)}%
            </div>
          `;
        } else if (tipo === 'execucao') {
          const barraProgresso = '█'.repeat(Math.floor(municipioData.percentual_execucao! / 10)) + '░'.repeat(10 - Math.floor(municipioData.percentual_execucao! / 10));
          tooltipContent = `
            <div style="font-size: 12px;">
              <strong>${nomeFormatado}</strong><br/>
              Execução: ${municipioData.percentual_execucao?.toFixed(1)}% ${barraProgresso}<br/>
              Parcelas Pagas: ${municipioData.parcelas_pagas}/${municipioData.total_parcelas}<br/>
              Valor Pago: R$ ${municipioData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          `;
        } else if (tipo === 'densidade') {
          tooltipContent = `
            <div style="font-size: 12px;">
              <strong>${nomeFormatado}</strong><br/>
              Densidade: ${municipioData.total_processos} obras<br/>
              Total de Processos: ${municipioData.total_processos}
            </div>
          `;
        }
      } else {
        tooltipContent = `
          <div style="font-size: 12px;">
            <strong>${nomeFormatado}</strong><br/>
            Sem dados disponíveis
          </div>
        `;
      }
    } else {
      const regiaoData = obterDadosRegiao(nome);
      
      if (regiaoData) {
        if (tipo === 'investimento') {
          tooltipContent = `
            <div style="font-size: 12px;">
              <strong>${regiaoData.regiao_nome}</strong><br/>
              Valor Total: R$ ${regiaoData.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br/>
              Processos: ${regiaoData.total_processos}<br/>
              Valor Médio: R$ ${regiaoData.valor_medio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<br/>
              % do Estado: ${regiaoData.percentual.toFixed(1)}%
            </div>
          `;
        } else if (tipo === 'densidade') {
          tooltipContent = `
            <div style="font-size: 12px;">
              <strong>${regiaoData.regiao_nome}</strong><br/>
              Densidade: ${regiaoData.total_processos} obras<br/>
              Total de Processos: ${regiaoData.total_processos}<br/>
              Média: ${regiaoData.valor_medio.toFixed(2)} processos/município
            </div>
          `;
        }
      }
    }
    
    if (tooltipContent) {
      layer.bindTooltip(tooltipContent, { sticky: true, direction: 'top' });
    }

    layer.setStyle({
      color: '#333',
      weight: 1,
      opacity: 0.5,
      fillColor: corOriginal,
      fillOpacity: 0.6,
    });

    layer.on({
      mouseover: (evento) => {
        layer.setStyle({
          color: '#000',
          weight: 2,
          opacity: 1,
          fillColor: corOriginal,
          fillOpacity: 0.8,
        });
      },
      mouseout: (evento) => {
        layer.setStyle({
          color: '#333',
          weight: 1,
          opacity: 0.5,
          fillColor: corOriginal,
          fillOpacity: 0.6,
        });
      },
      click: (evento) => {
        if (nivel === 'municipio' && onMunicipioClick) {
          const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);
          onMunicipioClick(nomeFormatado);
        } else if (nivel === 'regiao') {
          const regiaoData = obterDadosRegiao(nome);
          if (regiaoData && onRegiaoClick) {
            onRegiaoClick(regiaoData.regiao_nome);
          }
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
