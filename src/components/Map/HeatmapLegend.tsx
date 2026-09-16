import { useState, useRef, useEffect } from 'react';

type HeatmapTipo = 'investimento' | 'execucao' | 'risco' | 'fluxo_caixa' | 'densidade';

interface HeatmapLegendProps {
  visivel: boolean;
  tipo?: HeatmapTipo;
  nivel?: 'regiao' | 'municipio';
  maxValor?: number;
}

export function HeatmapLegend({ visivel, tipo = 'investimento', nivel = 'regiao', maxValor = 0 }: HeatmapLegendProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
      
      // Considera movimento se a posição mudou significativamente
      if (Math.abs(newPosition.x - position.x) > 3 || Math.abs(newPosition.y - position.y) > 3) {
        setHasMoved(true);
      }
      
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  if (!visivel) return null;

  let grades;
  let titulo;

  // Função para formatar valores monetários
  const formatarValor = (valor: number, nivel: 'regiao' | 'municipio') => {
    if (nivel === 'regiao') {
      if (valor >= 1000000) {
        return `R$ ${(valor / 1000000).toFixed(1)} milhões`;
      } else if (valor >= 1000) {
        return `R$ ${(valor / 1000).toFixed(1)} mil`;
      }
      return `R$ ${valor.toFixed(0)}`;
    } else {
      if (valor >= 1000000) {
        return `R$ ${(valor / 1000000).toFixed(1)} milhões`;
      } else if (valor >= 1000) {
        return `R$ ${(valor / 1000).toFixed(1)} mil`;
      }
      return `R$ ${valor.toFixed(0)}`;
    }
  };

  if (tipo === 'investimento') {
    titulo = `Heatmap de Investimento - ${nivel === 'regiao' ? 'Por Região' : 'Por Município'}`;
    
    // Calcular os limites de valor baseados no maxValor
    const limiteBaixo = maxValor * 0.2;
    const limiteMedio = maxValor * 0.5;
    const limiteAlto = maxValor * 0.8;
    
    if (nivel === 'regiao') {
      grades = [
        { cor: '#3498DB', label: `Baixo (0-20%) - Até ${formatarValor(limiteBaixo, 'regiao')}` },
        { cor: '#27AE60', label: `Médio (20-50%) - ${formatarValor(limiteBaixo, 'regiao')} a ${formatarValor(limiteMedio, 'regiao')}` },
        { cor: '#E67E22', label: `Alto (50-80%) - ${formatarValor(limiteMedio, 'regiao')} a ${formatarValor(limiteAlto, 'regiao')}` },
        { cor: '#E74C3C', label: `Muito Alto (80%+) - Acima de ${formatarValor(limiteAlto, 'regiao')}` }
      ];
    } else {
      grades = [
        { cor: '#3498DB', label: `Baixo (0-20%) - Até ${formatarValor(limiteBaixo, 'municipio')}` },
        { cor: '#27AE60', label: `Médio (20-50%) - ${formatarValor(limiteBaixo, 'municipio')} a ${formatarValor(limiteMedio, 'municipio')}` },
        { cor: '#E67E22', label: `Alto (50-80%) - ${formatarValor(limiteMedio, 'municipio')} a ${formatarValor(limiteAlto, 'municipio')}` },
        { cor: '#E74C3C', label: `Muito Alto (80%+) - Acima de ${formatarValor(limiteAlto, 'municipio')}` }
      ];
    }
  } else if (tipo === 'execucao') {
    titulo = `Heatmap de Execução - ${nivel === 'regiao' ? 'Por Região' : 'Por Município'}`;
    if (nivel === 'regiao') {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Regiões com menor execução' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Regiões com maior execução' }
      ];
    } else {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Municípios com menor execução' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Municípios com maior execução' }
      ];
    }
  } else if (tipo === 'risco') {
    titulo = `Heatmap de Risco - ${nivel === 'regiao' ? 'Por Região' : 'Por Município'}`;
    if (nivel === 'regiao') {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Regiões com menor risco' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Regiões com maior risco' }
      ];
    } else {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Municípios com menor risco' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Municípios com maior risco' }
      ];
    }
  } else if (tipo === 'fluxo_caixa') {
    titulo = `Heatmap de Fluxo de Caixa - ${nivel === 'regiao' ? 'Por Região' : 'Por Município'}`;
    if (nivel === 'regiao') {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Regiões com menor fluxo' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Regiões com maior fluxo' }
      ];
    } else {
      grades = [
        { cor: '#3498DB', label: 'Baixo (0-20%) - Municípios com menor fluxo' },
        { cor: '#27AE60', label: 'Médio (20-50%)' },
        { cor: '#E67E22', label: 'Alto (50-80%)' },
        { cor: '#E74C3C', label: 'Muito Alto (80%+) - Municípios com maior fluxo' }
      ];
    }
  } else if (tipo === 'densidade') {
    titulo = `Heatmap de Densidade - ${nivel === 'regiao' ? 'Por Região' : 'Por Município'}`;
    if (nivel === 'regiao') {
      grades = [
        { cor: '#3498DB', label: '<10 processos - Regiões com menor densidade' },
        { cor: '#27AE60', label: '10-30 processos' },
        { cor: '#E67E22', label: '30-50 processos' },
        { cor: '#E74C3C', label: '>50 processos - Regiões com maior densidade' }
      ];
    } else {
      grades = [
        { cor: '#3498DB', label: '<5 obras - Municípios com menor densidade' },
        { cor: '#27AE60', label: '5-10 obras' },
        { cor: '#E67E22', label: '10-20 obras' },
        { cor: '#E74C3C', label: '>20 obras - Municípios com maior densidade' }
      ];
    }
  } else {
    titulo = 'Heatmap';
    grades = [
      { cor: '#3498DB', label: 'Baixo - Menor valor' },
      { cor: '#27AE60', label: 'Médio' },
      { cor: '#E67E22', label: 'Alto' },
      { cor: '#E74C3C', label: 'Muito Alto - Maior valor' }
    ];
  }

  return (
    <div
      ref={legendRef}
      style={{
        position: 'absolute',
        bottom: position.y === 0 ? 80 : 'auto',
        right: position.x === 0 ? 16 : 'auto',
        left: position.x !== 0 ? position.x : 'auto',
        top: position.y !== 0 ? position.y : 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 3000,
        maxWidth: 280,
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden',
        border: '2px solid #2563EB',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'grab',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!hasMoved) setIsOpen(!isOpen);
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{titulo}</span>
        <span style={{ fontSize: '12px' }}>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {grades.map((grade, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: grade.cor,
                    borderRadius: '2px',
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <span style={{ fontSize: '12px', flex: 1 }}>{grade.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
