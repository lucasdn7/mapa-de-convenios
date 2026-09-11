import { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Layer } from 'leaflet';

type MunicipioProperties = {
  NOME?: string;
  NOME_MUN?: string;
  NM_MUN?: string;
  [key: string]: unknown;
};

type MunicipioFeature = Feature<Geometry, MunicipioProperties>;
type MunicipiosData = FeatureCollection<Geometry, MunicipioProperties>;

const estiloBase = {
  color: '#2563EB',
  weight: 1,
  opacity: 0.85,
  fillColor: '#60A5FA',
  fillOpacity: 0.08,
};

function obterNome(feature: MunicipioFeature) {
  return String(
    feature.properties?.NOME_MUN ??
      feature.properties?.NM_MUN ??
      feature.properties?.NOME ??
      'Município'
  );
}

export function MunicipiosLayer() {
  const [dados, setDados] = useState<MunicipiosData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/geo/municipios-sc.geojson', { signal: controller.signal })
      .then((resposta) => {
        if (!resposta.ok) {
          throw new Error(`Não foi possível carregar os municípios (${resposta.status}).`);
        }
        return resposta.json() as Promise<MunicipiosData>;
      })
      .then(setDados)
      .catch((erro: unknown) => {
        if (erro instanceof DOMException && erro.name === 'AbortError') return;
        console.error('Erro ao carregar a camada de municípios:', erro);
      });

    return () => controller.abort();
  }, []);

  if (!dados) return null;

  const aoCriarCamada = (feature: MunicipioFeature, layer: Layer) => {
    const nome = obterNome(feature);
    layer.bindTooltip(nome, { sticky: true });
    layer.bindPopup(`<strong>${nome}</strong>`);

    layer.on({
      mouseover: (evento) => {
        evento.target.setStyle({
          weight: 2,
          color: '#1D4ED8',
          fillColor: '#3B82F6',
          fillOpacity: 0.22,
        });
      },
      mouseout: (evento) => {
        evento.target.setStyle(estiloBase);
      },
    });
  };

  return (
    <GeoJSON
      data={dados}
      style={estiloBase}
      onEachFeature={aoCriarCamada}
    />
  );
}
