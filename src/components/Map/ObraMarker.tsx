import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Obra } from '../../types/obra';
import { ObraPopup } from './ObraPopup';

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
        <ObraPopup obra={obra} />
      </Popup>
    </Marker>
  );
}
