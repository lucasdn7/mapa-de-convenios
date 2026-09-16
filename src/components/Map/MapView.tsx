import { useState, useEffect, useRef } from 'react';
import { LayersControl, MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { useObras } from '../../hooks/useObras';
import { filtrosVazios } from '../../types/obra';
import { ObraMarker } from './ObraMarker';
import { FilterPanel } from './FilterPanel';
import { MunicipiosLayer } from './MunicipiosLayer';
import { RegioesTuristicasLayer } from './RegioesTuristicasLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { HeatmapLegend } from './HeatmapLegend';
import { HeatmapLevelControl } from './HeatmapLevelControl';
import { RegioesLegend } from './RegioesLegend';
import { StatisticsPanel } from './StatisticsPanel';

type HeatmapTipo = 'investimento' | 'execucao' | 'risco' | 'fluxo_caixa' | 'densidade';
type HeatmapNivel = 'regiao' | 'municipio';

// Centro aproximado de Santa Catarina
const CENTRO_SC: [number, number] = [-27.35, -50.5];
const ZOOM_INICIAL = 7;

export function MapView() {
  const [filtros, setFiltros] = useState(filtrosVazios);
  const [regiaoDestacada, setRegiaoDestacada] = useState<string | null>(null);
  const [heatmapAtivo, setHeatmapAtivo] = useState(false);
  const [heatmapTipo, setHeatmapTipo] = useState<HeatmapTipo>('investimento');
  const [heatmapNivel, setHeatmapNivel] = useState<HeatmapNivel>('regiao');
  const [heatmapMaxValor, setHeatmapMaxValor] = useState<number>(0);
  const layersControlRef = useRef<any>(null);
  const { obras, obrasFiltradas, categorias, regioesTuristicas, statusIds, carregando, erro } = useObras(filtros);

  const handleFiltrarPorStatus = (statusId: number) => {
    setFiltros((prev) => ({
      ...prev,
      statusId: prev.statusId.includes(statusId) ? [] : [statusId],
    }));
  };

  const handleFiltrarPorRegiao = (regiaoId: number) => {
    setFiltros((prev) => ({
      ...prev,
      regiaoTuristica: prev.regiaoTuristica.includes(regiaoId) ? [] : [regiaoId],
    }));
  };

  const handleFiltrarPorMunicipio = (municipioNome: string) => {
    setFiltros((prev) => ({
      ...prev,
      busca: prev.busca === municipioNome ? '' : municipioNome,
    }));
  };

  const handleHeatmapTipoChange = (tipo: HeatmapTipo) => {
    setHeatmapTipo(tipo);
    setHeatmapAtivo(true);
  };

  const handleHeatmapNivelChange = (nivel: HeatmapNivel) => {
    setHeatmapNivel(nivel);
  };

  const handleHeatmapToggle = (tipo: HeatmapTipo, checked: boolean) => {
    if (checked) {
      setHeatmapTipo(tipo);
      setHeatmapAtivo(true);
    } else {
      setHeatmapAtivo(false);
    }
  };

  // Monitorar mudanças no LayersControl para detectar quando heatmaps são selecionados
  useEffect(() => {
    const checkHeatmapLayers = () => {
      if (!layersControlRef.current) return;

      const container = layersControlRef.current?.getContainer();
      if (!container) return;

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      let heatmapFound = false;
      let activeTipo: HeatmapTipo = 'investimento';

      checkboxes.forEach((checkbox: any) => {
        const label = checkbox.nextElementSibling?.textContent || '';
        if (checkbox.checked && label.includes('Heatmap:')) {
          heatmapFound = true;
          if (label.includes('Investimento')) activeTipo = 'investimento';
          else if (label.includes('Densidade')) activeTipo = 'densidade';
          else if (label.includes('Execução')) activeTipo = 'execucao';
          else if (label.includes('Risco')) activeTipo = 'risco';
          else if (label.includes('Fluxo de Caixa')) activeTipo = 'fluxo_caixa';
        }
      });

      if (heatmapFound) {
        setHeatmapTipo(activeTipo);
        setHeatmapAtivo(true);
      } else {
        setHeatmapAtivo(false);
      }
    };

    // Verificar inicialmente
    checkHeatmapLayers();

    // Adicionar listener para mudanças
    const interval = setInterval(checkHeatmapLayers, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <MapContainer
        center={CENTRO_SC}
        zoom={ZOOM_INICIAL}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LayersControl position="topright" ref={layersControlRef}>
          <LayersControl.Overlay checked name="Limites municipais">
            <MunicipiosLayer />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={!heatmapAtivo} name="Regiões Turísticas">
            <RegioesTuristicasLayer 
              regiaoDestacada={regiaoDestacada}
              onRegiaoClick={setRegiaoDestacada}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={heatmapAtivo && heatmapTipo === 'investimento'} name="Heatmap: Investimento">
            <HeatmapLayer 
              ano={filtros.ano}
              tipo="investimento"
              nivel={heatmapNivel}
              onMaxValorChange={setHeatmapMaxValor}
              onRegiaoClick={(regiaoNome) => {
                const regiao = regioesTuristicas.find(r => r.nome === regiaoNome);
                if (regiao) {
                  setFiltros(prev => ({
                    ...prev,
                    regiaoTuristica: prev.regiaoTuristica.includes(regiao.id) ? [] : [regiao.id]
                  }));
                }
              }}
              onMunicipioClick={(municipioNome) => {
                setFiltros(prev => ({
                  ...prev,
                  busca: prev.busca === municipioNome ? '' : municipioNome
                }));
              }}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked={heatmapAtivo && heatmapTipo === 'densidade'} name="Heatmap: Densidade">
            <HeatmapLayer 
              ano={filtros.ano}
              tipo="densidade"
              nivel={heatmapNivel}
              onMaxValorChange={() => {}} // Densidade não usa valores monetários
              onRegiaoClick={(regiaoNome) => {
                const regiao = regioesTuristicas.find(r => r.nome === regiaoNome);
                if (regiao) {
                  setFiltros(prev => ({
                    ...prev,
                    regiaoTuristica: prev.regiaoTuristica.includes(regiao.id) ? [] : [regiao.id]
                  }));
                }
              }}
              onMunicipioClick={(municipioNome) => {
                setFiltros(prev => ({
                  ...prev,
                  busca: prev.busca === municipioNome ? '' : municipioNome
                }));
              }}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Associações de municípios">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:Associacoes"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.65}
              attribution="Associações de Municípios: FURB"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Microrregiões">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:Microrregioes"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.5}
              attribution="Microrregiões: FURB"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Bacias hidrográficas">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:Bacias_Hidrograficas"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.4}
              attribution="Bacias Hidrográficas: FURB"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Rios principais">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:hidrografia_epagri"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.75}
              attribution="Rios principais: EPAGRI/FURB"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Uso da terra (MonitoraSC 2017)">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:monitorasc_2017_v5c"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.45}
              attribution="Uso da Terra: MonitoraSC/FURB"
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Mesorregiões">
            <WMSTileLayer
              url="https://monitora.furb.br/geoserver/ows"
              layers="geonode:Mesorregioes"
              format="image/png"
              transparent
              version="1.1.1"
              opacity={0.55}
              attribution="Mesorregiões: FURB"
            />
          </LayersControl.Overlay>
        </LayersControl>

        <MarkerClusterGroup chunkedLoading>
          {obrasFiltradas
            .filter((obra) => obra.latitude && obra.longitude)
            .map((obra) => (
              <ObraMarker key={obra.id} obra={obra} />
            ))}
        </MarkerClusterGroup>
      </MapContainer>

      {heatmapAtivo && <HeatmapLegend visivel={heatmapAtivo} tipo={heatmapTipo} nivel={heatmapNivel} />}

      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}>
        <FilterPanel
          filtros={filtros}
          onChange={setFiltros}
          categorias={categorias}
          regioesTuristicas={regioesTuristicas}
          statusIds={statusIds}
          totalResultados={obrasFiltradas.length}
        />
      </div>

      {heatmapAtivo && (
        <HeatmapLevelControl
          nivel={heatmapNivel}
          onNivelChange={handleHeatmapNivelChange}
          onFechar={() => setHeatmapAtivo(false)}
        />
      )}

      <StatisticsPanel
        obras={obrasFiltradas}
        onFiltrarPorStatus={handleFiltrarPorStatus}
        onFiltrarPorRegiao={handleFiltrarPorRegiao}
        onFiltrarPorMunicipio={handleFiltrarPorMunicipio}
      />

      <RegioesLegend
        regioesData={regioesTuristicas}
        regiaoSelecionada={regiaoDestacada}
        onRegiaoClick={setRegiaoDestacada}
      />

      {heatmapAtivo && (
        <HeatmapLegend 
          visivel={heatmapAtivo} 
          tipo={heatmapTipo} 
          nivel={heatmapNivel} 
          maxValor={heatmapMaxValor}
        />
      )}

      {carregando && (
        <div style={aviso}>Carregando obras...</div>
      )}

      {erro && (
        <div style={{ ...aviso, color: '#DC2626' }}>Erro ao carregar: {erro}</div>
      )}
    </div>
  );
}

const aviso: React.CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  background: '#fff',
  padding: '8px 16px',
  borderRadius: 6,
  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  fontSize: 13,
};
