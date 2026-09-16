import { useState, useEffect } from 'react';
import { Obra } from '../../types/obra';
import { STATUS_ID_LABELS } from '../../types/obra';
import { supabase } from '../../lib/supabase';

interface StatisticsPanelProps {
  obras: Obra[];
  onFiltrarPorStatus?: (statusId: number) => void;
  onFiltrarPorRegiao?: (regiaoId: number) => void;
  onFiltrarPorMunicipio?: (municipio: string) => void;
}

interface EstatisticasGerais {
  totalProcessos: number;
  valorTotalPortarias: number;
  valorContratos: number;
  valorRepassado: number;
  saldoRepassar: number;
  percentualExecutado: number;
  loading: boolean;
}

interface StatusStat {
  statusNome: string;
  total: number;
  percentual: number;
  statusId: number;
}

interface RegiaoStat {
  regiaoNome: string;
  valorTotal: number;
  totalProcessos: number;
  regiaoId: number;
}

interface MunicipioStat {
  municipioNome: string;
  valorTotal: number;
  totalProcessos: number;
}

interface Alertas {
  obrasParadas: number;
  contratosNaoAssinados: number;
  vencimentos30Dias: number;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarNumero(valor: number): string {
  return valor.toLocaleString('pt-BR');
}

function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2)}%`;
}

function getStatusEmoji(statusNome: string): string {
  const nomeLower = statusNome.toLowerCase();
  if (nomeLower.includes('aprovado') || nomeLower.includes('concluído')) return '🟢';
  if (nomeLower.includes('aguardando') || nomeLower.includes('em análise') || nomeLower.includes('pendente')) return '🟡';
  if (nomeLower.includes('parado') || nomeLower.includes('cancelado') || nomeLower.includes('suspenso')) return '🔴';
  return '⚪';
}

async function calcularEstatisticasGerais(obras: Obra[]): Promise<EstatisticasGerais> {
  try {
    // Total de processos
    const totalProcessos = obras.length;
    
    // Valor Total Portarias = soma de total_portaria_value
    const { data: portariaData } = await supabase
      .from('processes')
      .select('total_portaria_value');
    
    const valorTotalPortarias = portariaData?.reduce((sum, p) => sum + (p.total_portaria_value || 0), 0) || 0;
    
    // Valor dos Contratos = soma de total_concedente_value
    const { data: concedenteData } = await supabase
      .from('processes')
      .select('total_concedente_value');
    
    const valorContratos = concedenteData?.reduce((sum, p) => sum + (p.total_concedente_value || 0), 0) || 0;
    
    // Valor repassado = soma das parcelas pagas (com payment_date)
    const { data: paidParcels } = await supabase
      .from('process_parcels')
      .select('value')
      .not('payment_date', 'is', null);
    
    const valorRepassado = paidParcels?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
    
    // Saldo a Repassar = Valor dos Contratos - Valor Repassado
    const saldoRepassar = valorContratos - valorRepassado;
    
    // Percentual Executado = (Valor Repassado / Valor dos Contratos) * 100
    const percentualExecutado = valorContratos > 0 ? (valorRepassado / valorContratos) * 100 : 0;

    return {
      totalProcessos,
      valorTotalPortarias,
      valorContratos,
      valorRepassado,
      saldoRepassar,
      percentualExecutado,
      loading: false,
    };
  } catch (error) {
    console.error('Erro ao calcular estatísticas gerais:', error);
    return {
      totalProcessos: obras.length,
      valorTotalPortarias: 0,
      valorContratos: 0,
      valorRepassado: 0,
      saldoRepassar: 0,
      percentualExecutado: 0,
      loading: false,
    };
  }
}

function calcularStatusStats(obras: Obra[]): StatusStat[] {
  const statusMap = new Map<number, { total: number; nome: string }>();

  obras.forEach((obra) => {
    if (obra.status_id) {
      const current = statusMap.get(obra.status_id) || { total: 0, nome: obra.status_nome || STATUS_ID_LABELS[obra.status_id] || 'Desconhecido' };
      statusMap.set(obra.status_id, { total: current.total + 1, nome: current.nome });
    }
  });

  const total = obras.length;
  return Array.from(statusMap.entries())
    .map(([statusId, { total: count, nome }]) => ({
      statusNome: nome,
      total: count,
      percentual: total > 0 ? (count / total) * 100 : 0,
      statusId,
    }))
    .sort((a, b) => b.total - a.total);
}

function calcularRegioesStats(obras: Obra[]): RegiaoStat[] {
  const regiaoMap = new Map<number, { valorTotal: number; totalProcessos: number; nome: string }>();

  obras.forEach((obra) => {
    if (obra.region_id && obra.regiao_turistica) {
      const current = regiaoMap.get(obra.region_id) || { valorTotal: 0, totalProcessos: 0, nome: obra.regiao_turistica };
      regiaoMap.set(obra.region_id, {
        valorTotal: current.valorTotal + (obra.total_portaria_value || 0),
        totalProcessos: current.totalProcessos + 1,
        nome: current.nome,
      });
    }
  });

  return Array.from(regiaoMap.entries())
    .map(([regiaoId, { valorTotal, totalProcessos, nome }]) => ({
      regiaoNome: nome,
      valorTotal,
      totalProcessos,
      regiaoId,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 5);
}

function calcularMunicipiosStats(obras: Obra[]): MunicipioStat[] {
  const municipioMap = new Map<string, { valorTotal: number; totalProcessos: number }>();

  obras.forEach((obra) => {
    if (obra.municipio_nome) {
      const current = municipioMap.get(obra.municipio_nome) || { valorTotal: 0, totalProcessos: 0 };
      municipioMap.set(obra.municipio_nome, {
        valorTotal: current.valorTotal + (obra.total_portaria_value || 0),
        totalProcessos: current.totalProcessos + 1,
      });
    }
  });

  return Array.from(municipioMap.entries())
    .map(([municipioNome, { valorTotal, totalProcessos }]) => ({
      municipioNome,
      valorTotal,
      totalProcessos,
    }))
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 5);
}

function calcularAlertas(obras: Obra[]): Alertas {
  const obrasParadas = obras.filter(
    (obra) => obra.status_nome?.toLowerCase().includes('parado') || obra.status_nome?.toLowerCase().includes('suspenso')
  ).length;

  const contratosNaoAssinados = obras.filter((obra) => obra.contrato_assinado === false).length;

  const hoje = new Date();
  const vencimentos30Dias = obras.filter((obra) => {
    if (!obra.data_prestacao_contas) return false;
    const dataPrestacao = new Date(obra.data_prestacao_contas);
    const diffDias = Math.ceil((dataPrestacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return diffDias >= 0 && diffDias <= 30;
  }).length;

  return {
    obrasParadas,
    contratosNaoAssinados,
    vencimentos30Dias,
  };
}

export function StatisticsPanel({ obras, onFiltrarPorStatus, onFiltrarPorRegiao, onFiltrarPorMunicipio }: StatisticsPanelProps) {
  const [expandido, setExpandido] = useState(false);
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasGerais>({
    totalProcessos: 0,
    valorTotalPortarias: 0,
    valorContratos: 0,
    valorRepassado: 0,
    saldoRepassar: 0,
    percentualExecutado: 0,
    loading: true,
  });

  // Carregar estatísticas gerais do Supabase
  useEffect(() => {
    const loadEstatisticas = async () => {
      setEstatisticasGerais(prev => ({ ...prev, loading: true }));
      const stats = await calcularEstatisticasGerais(obras);
      setEstatisticasGerais(stats);
    };
    
    loadEstatisticas();
  }, [obras]);

  const statusStats = calcularStatusStats(obras);
  const regioesStats = calcularRegioesStats(obras);
  const municipiosStats = calcularMunicipiosStats(obras);
  const alertas = calcularAlertas(obras);

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        width: 300,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
      }}
    >
      {/* Botão de toggle */}
      <div
        onClick={() => setExpandido(!expandido)}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: expandido ? '2px solid #E9ECEF' : 'none',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E9ECEF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#F8F9FA';
        }}
      >
        <span style={{ fontWeight: 600, color: '#2C3E50' }}>
          📊 {expandido ? 'RESUMO GERAL' : 'Estatísticas'}
        </span>
        <span style={{ fontSize: 18, color: '#6C757D' }}>
          {expandido ? '▼' : '▲'}
        </span>
      </div>

      {/* Conteúdo */}
      {expandido && (
        <div
          style={{
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            padding: 16,
          }}
        >
      {/* Estatísticas Gerais */}
      <div style={{ marginBottom: 16 }}>
        {estatisticasGerais.loading ? (
          <div style={{ color: '#6C757D', fontSize: 12, textAlign: 'center', padding: '10px' }}>
            Carregando estatísticas...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
            <span style={{ color: '#6C757D' }}>Total de Processos</span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarNumero(estatisticasGerais.totalProcessos)}
            </span>

            <span style={{ color: '#6C757D' }}>Valor Total Portarias</span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarMoeda(estatisticasGerais.valorTotalPortarias)}
            </span>

            <span style={{ color: '#6C757D' }}>Valor dos Contratos</span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarMoeda(estatisticasGerais.valorContratos)}
            </span>

            <span style={{ color: '#6C757D' }}>Valor Repassado</span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarMoeda(estatisticasGerais.valorRepassado)}
            </span>

            <span style={{ color: '#6C757D' }}>Saldo a Repassar</span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarMoeda(estatisticasGerais.saldoRepassar)}
            </span>

            <span
              style={{ color: '#6C757D', cursor: 'help' }}
              title={`Calculado como: Valor Repassado / Valor dos Contratos\n${formatarMoeda(estatisticasGerais.valorRepassado)} / ${formatarMoeda(estatisticasGerais.valorContratos)} = ${formatarPercentual(estatisticasGerais.percentualExecutado)}`}
            >
              Percentual Executado
            </span>
            <span style={{ color: '#16A085', fontWeight: 600, fontFamily: 'monospace' }}>
              {formatarPercentual(estatisticasGerais.percentualExecutado)}
            </span>
          </div>
        )}
      </div>

      {/* Por Status */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C3E50',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid #E9ECEF',
          }}
        >
          📈 POR STATUS
        </div>
        {statusStats.map((stat) => (
          <div
            key={stat.statusId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              cursor: onFiltrarPorStatus ? 'pointer' : 'default',
            }}
            onClick={() => onFiltrarPorStatus?.(stat.statusId)}
            onMouseEnter={(e) => {
              if (onFiltrarPorStatus) {
                e.currentTarget.style.backgroundColor = '#E9ECEF';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ color: '#495057' }}>
              {getStatusEmoji(stat.statusNome)} {stat.statusNome}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#16A085', fontWeight: 600 }}>
              {stat.total} ({formatarPercentual(stat.percentual)})
            </span>
          </div>
        ))}
      </div>

      {/* Top 5 Regiões */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C3E50',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid #E9ECEF',
          }}
        >
          🏆 TOP 5 REGIÕES (por valor)
        </div>
        {regioesStats.map((stat, index) => (
          <div
            key={stat.regiaoId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              cursor: onFiltrarPorRegiao ? 'pointer' : 'default',
            }}
            onClick={() => onFiltrarPorRegiao?.(stat.regiaoId)}
            onMouseEnter={(e) => {
              if (onFiltrarPorRegiao) {
                e.currentTarget.style.backgroundColor = '#E9ECEF';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ color: '#495057' }}>
              {index + 1}. {stat.regiaoNome}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#16A085', fontWeight: 600 }}>
              {formatarMoeda(stat.valorTotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Top 5 Municípios */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C3E50',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid #E9ECEF',
          }}
        >
          🏙️ TOP 5 MUNICÍPIOS (por valor)
        </div>
        {municipiosStats.map((stat, index) => (
          <div
            key={stat.municipioNome}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 0',
              cursor: onFiltrarPorMunicipio ? 'pointer' : 'default',
            }}
            onClick={() => onFiltrarPorMunicipio?.(stat.municipioNome)}
            onMouseEnter={(e) => {
              if (onFiltrarPorMunicipio) {
                e.currentTarget.style.backgroundColor = '#E9ECEF';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ color: '#495057' }}>
              {index + 1}. {stat.municipioNome}
            </span>
            <span style={{ fontFamily: 'monospace', color: '#16A085', fontWeight: 600 }}>
              {formatarMoeda(stat.valorTotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Alertas Críticos */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#2C3E50',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid #E9ECEF',
          }}
        >
          ⚠️ ALERTAS CRÍTICOS
        </div>
        {alertas.obrasParadas > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: '#495057' }}>🔴 Obras paradas</span>
            <span style={{ fontFamily: 'monospace', color: '#E74C3C', fontWeight: 600 }}>
              {alertas.obrasParadas}
            </span>
          </div>
        )}
        {alertas.contratosNaoAssinados > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: '#495057' }}>📝 Contratos não assinados</span>
            <span style={{ fontFamily: 'monospace', color: '#F39C12', fontWeight: 600 }}>
              {alertas.contratosNaoAssinados}
            </span>
          </div>
        )}
        {alertas.vencimentos30Dias > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ color: '#495057' }}>⏰ Vencimentos em 30 dias</span>
            <span style={{ fontFamily: 'monospace', color: '#E67E22', fontWeight: 600 }}>
              {alertas.vencimentos30Dias}
            </span>
          </div>
        )}
        {alertas.obrasParadas === 0 && alertas.contratosNaoAssinados === 0 && alertas.vencimentos30Dias === 0 && (
          <div style={{ color: '#27AE60', fontStyle: 'italic', padding: '4px 0' }}>
            Nenhum alerta crítico
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
