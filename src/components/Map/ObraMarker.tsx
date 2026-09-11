import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Obra, STATUS_CORES, STATUS_LABELS } from '../../types/obra';

function criarIcone(cor: string, tipo: 'obra' | 'evento') {
  const forma = tipo === 'evento' ? '50%' : '4px';
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 18px;
      height: 18px;
      background:${cor};
      border-radius:${forma};
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
}

function formatarMoeda(valor: number | null) {
  if (valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: string | null) {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-BR');
}

interface ObraMarkerProps {
  obra: Obra;
}

export function ObraMarker({ obra }: ObraMarkerProps) {
  const cor = '#059669'; // Verde padrão para obras
  const icone = criarIcone(cor, 'obra');

  // Verificar se latitude e longitude são válidas
  const lat = obra.latitude;
  const lng = obra.longitude;

  if (!lat || !lng) {
    return null; // Não renderizar se não tiver coordenadas válidas
  }

  return (
    <Marker position={[lat, lng]} icon={icone}>
      <Popup minWidth={320}>
        <div style={{ fontFamily: 'inherit' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>
            {obra.object || 'Sem descrição'}
          </div>
          
          {obra.process_number && (
            <div style={{ fontSize: '12px', color: '#555', marginBottom: 8 }}>
              Processo: {obra.process_number}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '12px' }}>
            {obra.portaria_number && (
              <>
                <span style={{ color: '#777' }}>Portaria</span>
                <span>{obra.portaria_number}</span>
              </>
            )}

            {obra.total_portaria_value && (
              <>
                <span style={{ color: '#777' }}>Valor Portaria</span>
                <span>{formatarMoeda(obra.total_portaria_value)}</span>
              </>
            )}

            {obra.licitado_value && (
              <>
                <span style={{ color: '#777' }}>Valor Licitação</span>
                <span>{formatarMoeda(obra.licitado_value)}</span>
              </>
            )}

            {obra.status_nome && (
              <>
                <span style={{ color: '#777' }}>Status</span>
                <span>{obra.status_nome}</span>
              </>
            )}

            {obra.municipio_nome && (
              <>
                <span style={{ color: '#777' }}>Município</span>
                <span>{obra.municipio_nome}</span>
              </>
            )}

            {obra.regiao_turistica && (
              <>
                <span style={{ color: '#777' }}>Região Turística</span>
                <span>{obra.regiao_turistica}</span>
              </>
            )}

            {obra.vigencia_date && (
              <>
                <span style={{ color: '#777' }}>Vigência</span>
                <span>{formatarData(obra.vigencia_date)}</span>
              </>
            )}

            {obra.tipo_de_repasse && (
              <>
                <span style={{ color: '#777' }}>Tipo de Repasse</span>
                <span>{obra.tipo_de_repasse}</span>
              </>
            )}

            {obra.categoria && (
              <>
                <span style={{ color: '#777' }}>Categoria</span>
                <span>{obra.categoria}</span>
              </>
            )}

            {obra.contrato_assinado !== undefined && (
              <>
                <span style={{ color: '#777' }}>Contrato Assinado</span>
                <span>{obra.contrato_assinado ? 'Sim' : 'Não'}</span>
              </>
            )}
          </div>

          {obra.link_plataforma_governo && (
            <div style={{ marginTop: 8 }}>
              <a 
                href={obra.link_plataforma_governo} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}
              >
                Ver na Plataforma Governo
              </a>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
