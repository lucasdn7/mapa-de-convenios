import { CSSProperties, Fragment, MouseEvent, useCallback, useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../../lib/supabase';
import { DetalhesObraImagens, MedicaoObra, Obra } from '../../types/obra';

function criarIcone(cor: string, tipo: 'obra' | 'evento') {
  const forma = tipo === 'evento' ? '50%' : '4px';
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:${cor};border-radius:${forma};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9],
  });
}

function formatarMoeda(valor: number | null | undefined) {
  return valor == null ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: string | null) {
  return data ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR') : '—';
}

function formatarPercentual(percentual: number | null) {
  return percentual == null ? 'Aguardando' : `${percentual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% executado`;
}

interface ObraMarkerProps { obra: Obra; }

interface ParcelaBanco { id: number; parcel_number: number; value: number | null; status: string | null; }
interface ImagemBanco { parcela_id: number; image_url: string | null; percentual_execucao: number | null; data_foto: string | null; }

const detalhesIniciais: DetalhesObraImagens = { imagemPrincipalUrl: null, medicoes: [] };

export function ObraMarker({ obra }: ObraMarkerProps) {
  const [detalhes, setDetalhes] = useState<DetalhesObraImagens>(detalhesIniciais);
  const [carregandoImagens, setCarregandoImagens] = useState(false);
  const [imagensCarregadas, setImagensCarregadas] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);
  const lat = obra.latitude;
  const lng = obra.longitude;

  useEffect(() => {
    if (!imagemAmpliada) return;
    const fecharComEsc = (event: KeyboardEvent) => event.key === 'Escape' && setImagemAmpliada(null);
    window.addEventListener('keydown', fecharComEsc);
    return () => window.removeEventListener('keydown', fecharComEsc);
  }, [imagemAmpliada]);

  const buscarImagens = useCallback(async () => {
    if (!obra.id || imagensCarregadas || carregandoImagens) return;
    setCarregandoImagens(true);

    const [{ data: principais, error: erroPrincipal }, { data: parcelas, error: erroParcelas }] = await Promise.all([
      supabase.from('process_images').select('image_url').eq('process_id', obra.id).eq('tipo', 'principal').limit(1),
      supabase.from('process_parcels').select('id, parcel_number, value, status').eq('process_id', obra.id).order('parcel_number'),
    ]);

    if (erroPrincipal || erroParcelas) {
      console.error('Erro ao buscar imagens e medições da obra:', erroPrincipal || erroParcelas);
      setCarregandoImagens(false);
      return;
    }

    const parcelasDaObra = (parcelas || []) as ParcelaBanco[];
    const idsParcelas = parcelasDaObra.map((parcela) => parcela.id);
    const { data: imagens, error: erroImagens } = idsParcelas.length
      ? await supabase.from('process_images').select('parcela_id, image_url, percentual_execucao, data_foto').in('parcela_id', idsParcelas).eq('tipo', 'medicao')
      : { data: [], error: null };

    if (erroImagens) {
      console.error('Erro ao buscar fotos das medições:', erroImagens);
      setCarregandoImagens(false);
      return;
    }

    const imagensPorParcela = new Map((imagens as ImagemBanco[]).map((imagem) => [imagem.parcela_id, imagem]));
    const medicoes: MedicaoObra[] = parcelasDaObra.map((parcela) => {
      const imagem = imagensPorParcela.get(parcela.id);
      return {
        parcela: parcela.parcel_number,
        valor: parcela.value,
        status: parcela.status,
        image_url: imagem?.image_url ?? null,
        percentual: imagem?.percentual_execucao ?? null,
        data_foto: imagem?.data_foto ?? null,
      };
    });

    setDetalhes({ imagemPrincipalUrl: principais?.[0]?.image_url ?? null, medicoes });
    setImagensCarregadas(true);
    setCarregandoImagens(false);
  }, [carregandoImagens, imagensCarregadas, obra.id]);

  if (!lat || !lng) return null;

  const abrirImagem = (url: string) => (event: MouseEvent) => {
    event.stopPropagation();
    setImagemAmpliada(url);
  };
  const medicoesComFoto = detalhes.medicoes.filter((medicao) => medicao.image_url).length;

  return (
    <>
      <Marker position={[lat, lng]} icon={criarIcone('#059669', 'obra')}>
        <Popup minWidth={320} maxWidth={400} eventHandlers={{ popupopen: buscarImagens }}>
          <div style={{ fontFamily: 'inherit', maxHeight: '70vh', overflowY: 'auto' }}>
            <ImagemPrincipal url={detalhes.imagemPrincipalUrl} onClick={abrirImagem} />
            <div style={{ padding: '12px 2px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{obra.object || 'Sem descrição'}</div>
              {obra.process_number && <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Processo: {obra.process_number}</div>}
              <DadosObra obra={obra} />
            </div>

            <section style={{ borderTop: '1px solid #E5E7EB', marginTop: 12, paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: '#374151', marginBottom: 8 }}>
                Medições{detalhes.medicoes.length ? ` (${medicoesComFoto}/${detalhes.medicoes.length})` : ''}
              </div>
              {carregandoImagens && <div style={textoAuxiliar}>Carregando fotos e medições...</div>}
              {!carregandoImagens && imagensCarregadas && !detalhes.medicoes.length && <div style={textoAuxiliar}>Nenhuma medição registrada.</div>}
              {detalhes.medicoes.map((medicao) => <MedicaoCard key={medicao.parcela} medicao={medicao} onClick={abrirImagem} />)}
            </section>

            {obra.link_plataforma_governo && <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 12, paddingTop: 10 }}><a href={obra.link_plataforma_governo} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>Ver na Plataforma Governo</a></div>}
          </div>
        </Popup>
      </Marker>
      {imagemAmpliada && <Lightbox url={imagemAmpliada} onClose={() => setImagemAmpliada(null)} />}
    </>
  );
}

function ImagemPrincipal({ url, onClick }: { url: string | null; onClick: (url: string) => (event: MouseEvent) => void }) {
  return url ? <img src={url} alt="Foto principal da obra" onClick={onClick(url)} onMouseEnter={ampliarNoHover} onMouseLeave={restaurarNoHover} style={{ ...imagemClicavel, height: 250 }} /> : <div style={{ ...placeholder, height: 250 }}>Sem foto registrada</div>;
}

function MedicaoCard({ medicao, onClick }: { medicao: MedicaoObra; onClick: (url: string) => (event: MouseEvent) => void }) {
  return <article style={{ borderTop: '1px solid #F3F4F6', padding: '10px 0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, fontWeight: 600 }}><span>Parcela {medicao.parcela}</span><span>{formatarPercentual(medicao.percentual)}</span></div>
    {medicao.image_url ? <img src={medicao.image_url} alt={`Foto da parcela ${medicao.parcela}`} onClick={onClick(medicao.image_url)} onMouseEnter={ampliarNoHover} onMouseLeave={restaurarNoHover} style={{ ...imagemClicavel, height: 120, marginTop: 8 }} /> : <div style={{ ...placeholder, height: 72, marginTop: 8, fontSize: 12 }}>Sem foto registrada</div>}
    <div style={{ color: '#4B5563', fontSize: 12, marginTop: 6 }}>{formatarMoeda(medicao.valor)}{medicao.data_foto && ` | ${formatarData(medicao.data_foto)}`}</div>
  </article>;
}

function DadosObra({ obra }: { obra: Obra }) {
  const campos: [string, string | number | null | undefined][] = [
    ['Portaria', obra.portaria_number], ['Valor Portaria', obra.total_portaria_value == null ? null : formatarMoeda(obra.total_portaria_value)], ['Valor Licitação', obra.licitado_value == null ? null : formatarMoeda(obra.licitado_value)], ['Status', obra.status_nome], ['Município', obra.municipio_nome], ['Região Turística', obra.regiao_turistica], ['Vigência', obra.vigencia_date ? formatarData(obra.vigencia_date) : null], ['Tipo de Repasse', obra.tipo_de_repasse], ['Categoria', obra.categoria], ['Contrato Assinado', obra.contrato_assinado === undefined ? null : obra.contrato_assinado ? 'Sim' : 'Não'],
  ];
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 12 }}>{campos.filter(([, valor]) => valor != null && valor !== '').map(([rotulo, valor]) => <Fragment key={rotulo}><span style={{ color: '#777' }}>{rotulo}</span><span>{valor}</span></Fragment>)}</div>;
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(0, 0, 0, .82)' }}><button type="button" aria-label="Fechar imagem" onClick={onClose} style={{ position: 'fixed', top: 16, right: 20, border: 0, borderRadius: '50%', width: 36, height: 36, background: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button><img src={url} alt="Imagem ampliada da obra" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }} /></div>;
}

const imagemClicavel: CSSProperties = { width: '100%', objectFit: 'cover', display: 'block', borderRadius: 4, cursor: 'pointer', transition: 'transform .2s ease' };
const placeholder: CSSProperties = { width: '100%', display: 'grid', placeItems: 'center', borderRadius: 4, color: '#6B7280', background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)', textAlign: 'center' };
const textoAuxiliar: CSSProperties = { color: '#6B7280', fontSize: 12, padding: '4px 0 8px' };
const ampliarNoHover = (event: MouseEvent<HTMLImageElement>) => { event.currentTarget.style.transform = 'scale(1.05)'; };
const restaurarNoHover = (event: MouseEvent<HTMLImageElement>) => { event.currentTarget.style.transform = 'scale(1)'; };
