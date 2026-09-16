import { useState, useRef, useEffect } from 'react';
import { CORES_REGIOES } from '../../constants/regioes';

interface RegioesLegendProps {
  regioesData: { id: number; nome: string }[];
  regiaoSelecionada: string | null;
  onRegiaoClick: (regiao: string | null) => void;
}

export function RegioesLegend({ regioesData, regiaoSelecionada, onRegiaoClick }: RegioesLegendProps) {
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

  const regioesOrdenadas = regioesData
    .map(r => r.nome)
    .filter(nome => CORES_REGIOES[nome])
    .sort((a, b) => a.localeCompare(b));

  return (
    <div
      ref={legendRef}
      style={{
        position: 'absolute',
        bottom: position.y === 0 ? 16 : 'auto',
        right: position.x === 0 ? 16 : 'auto',
        left: position.x !== 0 ? position.x : 'auto',
        top: position.y !== 0 ? position.y : 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        maxWidth: 280,
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'hidden',
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
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Regiões Turísticas</span>
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
          {regioesOrdenadas.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Carregando regiões...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {regioesOrdenadas.map((regiao) => (
                <div
                  key={regiao}
                  onClick={() => onRegiaoClick(regiaoSelecionada === regiao ? null : regiao)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: regiaoSelecionada === regiao ? '#f0f0f0' : 'transparent',
                    border: regiaoSelecionada === regiao ? '1px solid #ddd' : '1px solid transparent',
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: CORES_REGIOES[regiao],
                      borderRadius: '2px',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                  <span style={{ fontSize: '12px', flex: 1 }}>{regiao}</span>
                  {regiaoSelecionada === regiao && (
                    <span style={{ fontSize: '10px', color: '#666' }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}