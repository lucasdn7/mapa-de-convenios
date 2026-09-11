import { useState } from 'react';
import { LayersControl, MapContainer, TileLayer, WMSTileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { useObras } from '../../hooks/useObras';
import { filtrosVazios } from '../../types/obra';
import { ObraMarker } from './ObraMarker';
import { FilterPanel } from './FilterPanel';
import { MunicipiosLayer } from './MunicipiosLayer';
import { RegioesTuristicasLayer } from './RegioesTuristicasLayer';
import { RegioesLegend } from './RegioesLegend';

// Centro aproximado de Santa Catarina
const CENTRO_SC: [number, number] = [-27.35, -50.5];
const ZOOM_INICIAL = 7;

export function MapView() {
  const [filtros, setFiltros] = useState(filtrosVazios);
  const [regiaoDestacada, setRegiaoDestacada] = useState<string | null>(null);
  const { obrasFiltradas, categorias, regioesTuristicas, statusIds, carregando, erro } = useObras(filtros);

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

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Limites municipais">
            <MunicipiosLayer />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Regiões Turísticas">
            <RegioesTuristicasLayer 
              regiaoDestacada={regiaoDestacada}
              onRegiaoClick={setRegiaoDestacada}
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

      <RegioesLegend 
        regioesData={regioesTuristicas}
        regiaoSelecionada={regiaoDestacada}
        onRegiaoClick={setRegiaoDestacada}
      />

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
