import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

type HeatmapTipo = 'investimento' | 'execucao' | 'risco' | 'fluxo_caixa' | 'densidade';
type HeatmapNivel = 'regiao' | 'municipio';

interface HeatmapLayerControlProps {
  tipo: HeatmapTipo;
  nivel: HeatmapNivel;
  onTipoChange: (tipo: HeatmapTipo) => void;
  onNivelChange: (nivel: HeatmapNivel) => void;
  onAtivarChange: (ativo: boolean) => void;
  ativo: boolean;
}

export function HeatmapLayerControl({ 
  tipo, 
  nivel, 
  onTipoChange, 
  onNivelChange, 
  onAtivarChange,
  ativo 
}: HeatmapLayerControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remover controle anterior se existir
    if (controlRef.current) {
      map.removeControl(controlRef.current);
      controlRef.current = null;
    }

    // Criar controle customizado
    const CustomControl = L.Control.extend({
      options: {
        position: 'topright'
      },
      
      onAdd: function(map: L.Map) {
        const container = L.DomUtil.create('div', 'heatmap-layer-control');
        container.style.backgroundColor = 'white';
        container.style.padding = '10px';
        container.style.borderRadius = '4px';
        container.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
        container.style.fontSize = '12px';
        container.style.marginTop = '5px';
        container.style.marginBottom = '5px';

        // Checkbox para ativar/desativar
        const checkboxContainer = L.DomUtil.create('div', '', container);
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.marginBottom = '8px';

        const checkbox = L.DomUtil.create('input', '', checkboxContainer) as HTMLInputElement;
        checkbox.type = 'checkbox';
        checkbox.checked = ativo;
        checkbox.style.marginRight = '8px';
        checkbox.style.cursor = 'pointer';

        const label = L.DomUtil.create('label', '', checkboxContainer);
        label.textContent = 'Heatmap';
        label.style.cursor = 'pointer';
        label.style.fontWeight = '600';

        L.DomEvent.on(checkbox, 'change', (e) => {
          onAtivarChange((e.target as HTMLInputElement).checked);
        });

        L.DomEvent.on(label, 'click', () => {
          checkbox.checked = !checkbox.checked;
          onAtivarChange(checkbox.checked);
        });

        // Dropdown de tipo
        const tipoLabel = L.DomUtil.create('div', '', container);
        tipoLabel.textContent = 'Tipo:';
        tipoLabel.style.fontWeight = '600';
        tipoLabel.style.marginBottom = '4px';
        tipoLabel.style.fontSize = '11px';
        tipoLabel.style.color = '#666';

        const tipoSelect = L.DomUtil.create('select', '', container) as HTMLSelectElement;
        tipoSelect.style.width = '100%';
        tipoSelect.style.marginBottom = '8px';
        tipoSelect.style.padding = '4px';
        tipoSelect.style.border = '1px solid #ddd';
        tipoSelect.style.borderRadius = '3px';
        tipoSelect.style.fontSize = '11px';
        tipoSelect.style.cursor = 'pointer';

        const tipos: { value: HeatmapTipo; label: string }[] = [
          { value: 'investimento', label: 'Investimento' },
          { value: 'execucao', label: 'Execução' },
          { value: 'risco', label: 'Risco' },
          { value: 'fluxo_caixa', label: 'Fluxo de Caixa' },
          { value: 'densidade', label: 'Densidade' }
        ];

        tipos.forEach(t => {
          const option = L.DomUtil.create('option', '', tipoSelect) as HTMLOptionElement;
          option.value = t.value;
          option.text = t.label;
          option.selected = t.value === tipo;
        });

        L.DomEvent.on(tipoSelect, 'change', (e) => {
          onTipoChange((e.target as HTMLSelectElement).value as HeatmapTipo);
        });

        // Dropdown de nível
        const nivelLabel = L.DomUtil.create('div', '', container);
        nivelLabel.textContent = 'Nível:';
        nivelLabel.style.fontWeight = '600';
        nivelLabel.style.marginBottom = '4px';
        nivelLabel.style.fontSize = '11px';
        nivelLabel.style.color = '#666';

        const nivelSelect = L.DomUtil.create('select', '', container) as HTMLSelectElement;
        nivelSelect.style.width = '100%';
        nivelSelect.style.padding = '4px';
        nivelSelect.style.border = '1px solid #ddd';
        nivelSelect.style.borderRadius = '3px';
        nivelSelect.style.fontSize = '11px';
        nivelSelect.style.cursor = 'pointer';

        const nivelRegiao = L.DomUtil.create('option', '', nivelSelect) as HTMLOptionElement;
        nivelRegiao.value = 'regiao';
        nivelRegiao.text = 'Por Região';
        nivelRegiao.selected = nivel === 'regiao';

        const nivelMunicipio = L.DomUtil.create('option', '', nivelSelect) as HTMLOptionElement;
        nivelMunicipio.value = 'municipio';
        nivelMunicipio.text = 'Por Município';
        nivelMunicipio.selected = nivel === 'municipio';

        L.DomEvent.on(nivelSelect, 'change', (e) => {
          onNivelChange((e.target as HTMLSelectElement).value as HeatmapNivel);
        });

        L.DomEvent.disableClickPropagation(container);
        
        return container;
      }
    });

    const control = new CustomControl();
    control.addTo(map);
    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
    };
  }, [map, ativo]); // Dependências mínimas para evitar loops

  // Atualizar valores dos controles quando tipo/nivel mudam
  useEffect(() => {
    if (!map || !controlRef.current) return;
    
    const container = map.getContainer().querySelector('.heatmap-layer-control');
    if (container) {
      const tipoSelect = container.querySelector('select:nth-of-type(1)') as HTMLSelectElement;
      const nivelSelect = container.querySelector('select:nth-of-type(2)') as HTMLSelectElement;
      
      if (tipoSelect) tipoSelect.value = tipo;
      if (nivelSelect) nivelSelect.value = nivel;
    }
  }, [map, tipo, nivel]);

  return null;
}