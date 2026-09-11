# WebGIS Obras SC

Mapa interativo de obras/eventos no estado de Santa Catarina, com filtros por status, categoria, região turística, tipo, texto, valor e prazo de vencimento de processo.

## Setup local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Rode o SQL em `sql/schema.sql` no editor SQL do seu projeto Supabase (Dashboard → SQL Editor).

3. Copie `.env.example` para `.env` e preencha com a URL e a chave anônima do seu projeto Supabase (Dashboard → Project Settings → API).

4. Rode localmente:
   ```bash
   npm run dev
   ```

## Limites municipais

Os limites municipais de Santa Catarina estão em `public/geo/municipios-sc.geojson`. O arquivo foi convertido do shapefile `LimitesMunic-2013` para WGS84 (`EPSG:4326`), o sistema de coordenadas utilizado pelo Leaflet.

O componente `src/components/Map/MunicipiosLayer.tsx` carrega a camada, exibe o nome do município em tooltip e abre um popup ao clicar. A camada é adicionada ao `MapView` antes dos marcadores, portanto as obras permanecem visíveis sobre os polígonos.

O mapa também possui a camada WMS **Associações de Municípios**, publicada pela FURB/GeoNode. Ela pode ser ativada ou desativada no controle de camadas no canto superior direito:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:Associacoes
Formato:  image/png transparente
CRS:      EPSG:32722 ou CRS:84
```

Como essa camada é WMS, ela é renderizada como imagem pelo servidor. Isso permite visualização e controle de visibilidade, mas não oferece os atributos individuais das associações para os popups do navegador. A fonte dos metadados é a [página de metadados da camada](https://monitora.furb.br/showmetadata/xsl/16).

Também foi adicionada a camada WMS **Microrregiões**, no mesmo servidor:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:Microrregioes
Formato:  image/png transparente
CRS:      EPSG:32722 ou CRS:84
```

Ela pode ser ligada ou desligada no controle de camadas. Os metadados estão disponíveis na [página de metadados das microrregiões](https://monitora.furb.br/showmetadata/xsl/13).

Também foi adicionada a camada WMS **Bacias Hidrográficas**:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:Bacias_Hidrograficas
Formato:  image/png transparente
CRS:      EPSG:32722 ou CRS:84
```

Essa camada também pode ser ligada ou desligada no controle no canto superior direito. Os metadados estão disponíveis na [página de metadados das bacias hidrográficas](https://monitora.furb.br/showmetadata/xsl/11).

Também foi adicionada a camada WMS **Rios principais**, baseada na hidrografia da EPAGRI:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:hidrografia_epagri
Formato:  image/png transparente
CRS:      EPSG:32722 ou CRS:84
```

A camada aparece no controle do mapa com opacidade de 75% e pode ser ligada ou desligada conforme necessário. Os metadados estão disponíveis na [página de metadados dos rios principais](https://monitora.furb.br/showmetadata/xsl/10).

Também foi adicionada a camada WMS **Uso da Terra (MonitoraSC 2017)**. Ela fica desativada inicialmente porque é uma camada temática de cobertura extensa e pode encobrir visualmente os demais limites quando ligada:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:monitorasc_2017_v5c
Formato:  image/png transparente
Opacidade: 45%
CRS:      EPSG:32722 ou CRS:84
```

Ative-a no controle de camadas quando quiser comparar o uso da terra com os municípios, bacias, rios e obras. Os metadados estão disponíveis na [página de metadados do uso da terra](https://monitora.furb.br/showmetadata/xsl/31).

Também foi adicionada a camada WMS **Mesorregiões**:

```text
Servidor: https://monitora.furb.br/geoserver/ows
Camada:   geonode:Mesorregioes
Formato:  image/png transparente
Opacidade: 55%
CRS:      EPSG:32722 ou CRS:84
```

A camada fica disponível no controle de camadas e inicia ativada. Os metadados estão disponíveis na [página de metadados das mesorregiões](https://monitora.furb.br/showmetadata/xsl/14).

Para regenerar o GeoJSON a partir dos arquivos originais do shapefile, é necessário ter o GDAL instalado e executar:

```bash
SHAPE_ENCODING=ISO-8859-1 ogr2ogr \
  -f GeoJSON \
  -t_srs EPSG:4326 \
  -lco RFC7946=YES \
  -lco COORDINATE_PRECISION=6 \
  public/geo/municipios-sc.geojson \
  /caminho/LimitesMunic-2013.shp
```

## Onde publicar (deploy)

O projeto é um site estático (Vite + React), então roda em qualquer hospedagem de front-end estático. As opções mais simples e gratuitas:

### Vercel (recomendado)
1. Suba o código para um repositório no GitHub.
2. Acesse vercel.com, clique em "Add New Project" e importe o repositório.
3. A Vercel detecta automaticamente que é um projeto Vite.
4. Em "Environment Variables", adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os mesmos valores do seu `.env`).
5. Clique em "Deploy". Em poucos minutos você tem uma URL pública (ex: `webgis-obras-sc.vercel.app`).
6. Todo novo `push` no GitHub gera um novo deploy automaticamente.

### Netlify (alternativa equivalente)
1. Suba o código para o GitHub.
2. Em app.netlify.com, "Add new site" → "Import an existing project".
3. Build command: `npm run build`, Publish directory: `dist`.
4. Adicione as mesmas variáveis de ambiente em "Site settings" → "Environment variables".

Ambas têm plano gratuito suficiente para esse projeto (tráfego baixo/médio, sem backend próprio — o backend é o Supabase).

## Estrutura

```
src/
  components/Map/
    MapView.tsx      # componente principal (mapa + painel de filtros)
    MunicipiosLayer.tsx # polígonos e identificação dos municípios
    ObraMarker.tsx    # marcador individual com popup
    FilterPanel.tsx   # painel de filtros
  hooks/
    useObras.ts       # busca dados do Supabase e aplica filtros
  lib/
    supabase.ts       # cliente Supabase
  types/
    obra.ts           # tipos e constantes
public/
  geo/
    municipios-sc.geojson # limites municipais de SC em EPSG:4326
sql/
  schema.sql          # schema do banco, view geográfica e RLS
```
