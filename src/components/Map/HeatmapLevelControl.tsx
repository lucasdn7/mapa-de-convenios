import { useState, useRef, useEffect } from 'react';

type HeatmapNivel = 'regiao' | 'municipio';

interface HeatmapLevelControlProps {
  nivel: HeatmapNivel;
  onNivelChange: (nivel: HeatmapNivel) => void;
  onFechar: () => void;
}

export function HeatmapLevelControl({ nivel, onNivelChange, onFechar }: HeatmapLevelControlProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const controlRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
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
  }, [isDragging, dragStart]);

  return (
    <div
      ref={controlRef}
      style={{
        position: 'absolute',
        top: position.y === 0 ? 16 : 'auto',
        left: position.x === 0 ? 340 : 'auto',
        right: position.x !== 0 ? 'auto' : 'auto',
        bottom: position.y !== 0 ? position.y : 'auto',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          width: 280,
          fontSize: 13,
          border: '2px solid #2563EB',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'grab',
            userSelect: 'none',
            marginBottom: 4,
          }}
          onMouseDown={handleMouseDown}
        >
          <span style={{ fontWeight: 600, color: '#333' }}>Nível do Heatmap</span>
          <span style={{ fontSize: '12px', color: '#666' }}>⋮⋮</span>
        </div>

        <div>
          <select
            value={nivel}
            onChange={(e) => onNivelChange(e.target.value as HeatmapNivel)}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="regiao">Por Região</option>
            <option value="municipio">Por Município</option>
          </select>
        </div>

        <button
          onClick={onFechar}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 6,
            backgroundColor: '#E8E8E8',
            color: '#666',
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 400,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#D0D0D0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E8E8E8';
          }}
        >
          Fechar Heatmap
        </button>
      </div>
    </div>
  );
}