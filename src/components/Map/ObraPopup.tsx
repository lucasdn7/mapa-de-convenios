import { useState, useEffect } from 'react';
import { Obra, Medicao } from '../../types/obra';
import { ImageLightbox } from './ImageLightbox';
import { supabase } from '../../lib/supabase';

interface ObraPopupProps {
  obra: Obra;
  onDetalhesCarregados?: (obraDetalhada: Obra) => void;
}

function formatarMoeda(valor: number | null) {
  if (valor === null) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(data: string | null) {
  if (!data) return '—';
  return new Date(data).toLocaleDateString('pt-BR');
}

function formatarPercentual(percentual: number | null) {
  if (percentual === null) return 'Aguardando';
  return `${percentual.toFixed(2)}% Executado`;
}

export function ObraPopup({ obra, onDetalhesCarregados }: ObraPopupProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [obraDetalhada, setObraDetalhada] = useState<Obra | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    // Buscar detalhes da obra quando o popup for aberto
    async function buscarDetalhes() {
      if (!obra.id) return;

      setCarregando(true);
      try {
        // Buscar imagem principal
        const { data: imagemPrincipal } = await supabase
          .from('process_images')
          .select('image_url')
          .eq('process_id', obra.id)
          .eq('tipo', 'principal')
          .single();

        // Buscar medições com imagens
        const { data: parcelas } = await supabase
          .from('process_parcels')
          .select('id, parcel_number, value, status')
          .eq('process_id', obra.id)
          .order('parcel_number');

        const medicoesComImagens = await Promise.all(
          (parcelas || []).map(async (parcela) => {
            const { data: imagemMedicao } = await supabase
              .from('process_images')
              .select('image_url, percentual_execucao, data_foto')
              .eq('parcela_id', parcela.id)
              .eq('tipo', 'medicao')
              .single();

            return {
              parcela: parcela.parcel_number,
              valor: parcela.value,
              status: parcela.status,
              image_url: imagemMedicao?.image_url || null,
              percentual: imagemMedicao?.percentual_execucao || null,
              data_foto: imagemMedicao?.data_foto || null,
            };
          })
        );

        const obraAtualizada: Obra = {
          ...obra,
          imagem_principal_url: imagemPrincipal?.image_url || null,
          medicoes: medicoesComImagens,
        };

        setObraDetalhada(obraAtualizada);
        onDetalhesCarregados?.(obraAtualizada);
      } catch (error) {
        console.error('Erro ao buscar detalhes da obra:', error);
      } finally {
        setCarregando(false);
      }
    }

    buscarDetalhes();
  }, [obra.id, onDetalhesCarregados]);

  const obraExibir = obraDetalhada || obra;
  const medicoes = obraExibir.medicoes || [];

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {lightboxImage && (
        <ImageLightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      {carregando && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          Carregando fotos...
        </div>
      )}

      {/* Foto Principal */}
      {obraExibir.imagem_principal_url ? (
        <div style={{ marginBottom: '12px' }}>
          <img
            src={obraExibir.imagem_principal_url}
            alt="Foto principal da obra"
            style={{
              width: '100%',
              height: '250px',
              objectFit: 'cover',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onClick={() => setLightboxImage(obraExibir.imagem_principal_url || null)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        </div>
      ) : (
        <div
          style={{
            marginBottom: '12px',
            height: '250px',
            backgroundColor: '#f5f5f5',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '14px',
          }}
        >
          Sem foto registrada
        </div>
      )}

      {/* Informações da obra */}
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4 }}>
        {obraExibir.object || 'Sem descrição'}
      </div>

      {obraExibir.process_number && (
        <div style={{ fontSize: '12px', color: '#555', marginBottom: 8 }}>
          Processo: {obraExibir.process_number}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '12px' }}>
        {obraExibir.portaria_number && (
          <>
            <span style={{ color: '#777' }}>Portaria</span>
            <span>{obraExibir.portaria_number}</span>
          </>
        )}

        {obraExibir.total_portaria_value && (
          <>
            <span style={{ color: '#777' }}>Valor Portaria</span>
            <span>{formatarMoeda(obraExibir.total_portaria_value)}</span>
          </>
        )}

        {obraExibir.licitado_value && (
          <>
            <span style={{ color: '#777' }}>Valor Licitação</span>
            <span>{formatarMoeda(obraExibir.licitado_value)}</span>
          </>
        )}

        {obraExibir.status_nome && (
          <>
            <span style={{ color: '#777' }}>Status</span>
            <span>{obraExibir.status_nome}</span>
          </>
        )}

        {obraExibir.municipio_nome && (
          <>
            <span style={{ color: '#777' }}>Município</span>
            <span>{obraExibir.municipio_nome}</span>
          </>
        )}

        {obraExibir.regiao_turistica && (
          <>
            <span style={{ color: '#777' }}>Região Turística</span>
            <span>{obraExibir.regiao_turistica}</span>
          </>
        )}

        {obraExibir.contrato_assinado !== undefined && (
          <>
            <span style={{ color: '#777' }}>Contrato Assinado</span>
            <span>{obraExibir.contrato_assinado ? 'Sim' : 'Não'}</span>
          </>
        )}
      </div>

      {/* Seção de Medições */}
      {medicoes.length > 0 && (
        <>
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e5e5',
              fontWeight: 600,
              fontSize: '13px',
              marginBottom: '8px',
            }}
          >
            Medições ({medicoes.length})
          </div>

          {medicoes.map((medicao: Medicao, index: number) => (
            <div
              key={index}
              style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: index < medicoes.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
                Parcela {medicao.parcela} - {formatarPercentual(medicao.percentual)}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                {medicao.image_url ? (
                  <img
                    src={medicao.image_url}
                    alt={`Foto da parcela ${medicao.parcela}`}
                    style={{
                      height: '120px',
                      width: '120px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onClick={() => setLightboxImage(medicao.image_url)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: '120px',
                      width: '120px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: '#999',
                    }}
                  >
                    Sem foto
                  </div>
                )}

                <div style={{ flex: 1, fontSize: '11px' }}>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>Valor:</strong> {formatarMoeda(medicao.valor)}
                  </div>
                  <div style={{ marginBottom: '2px' }}>
                    <strong>Status:</strong> {medicao.status}
                  </div>
                  {medicao.data_foto && (
                    <div>
                      <strong>Data:</strong> {formatarData(medicao.data_foto)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Link para Plataforma Governo */}
      {obraExibir.link_plataforma_governo && (
        <div style={{ marginTop: 12 }}>
          <a
            href={obraExibir.link_plataforma_governo}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#2563EB', textDecoration: 'none' }}
          >
            Ver na Plataforma Governo
          </a>
        </div>
      )}
    </div>
  );
}
