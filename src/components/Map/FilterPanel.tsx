import { useState, useEffect, useRef } from 'react';
import { ObraFiltros, STATUS_ID_LABELS } from '../../types/obra';

interface FilterPanelProps {
  filtros: ObraFiltros;
  onChange: (filtros: ObraFiltros) => void;
  categorias: string[];
  regioesTuristicas: { id: number; nome: string }[];
  statusIds: number[];
  totalResultados: number;
}

export function FilterPanel({
  filtros,
  onChange,
  categorias,
  regioesTuristicas,
  statusIds,
  totalResultados,
}: FilterPanelProps) {
  function alternarValor<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        width: 300,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        fontSize: 13,
      }}
    >
      <div>
        <input
          type="text"
          placeholder="Buscar por processo ou descrição..."
          value={filtros.busca}
          onChange={(e) => onChange({ ...filtros, busca: e.target.value })}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {statusIds.length > 0 && (
        <FiltroGrupo titulo="Status">
          <MultiSelectDropdown
            options={statusIds.map(id => ({ value: id, label: STATUS_ID_LABELS[id] || `Status ${id}` }))}
            selected={filtros.statusId}
            onChange={(selected) => onChange({ ...filtros, statusId: selected })}
            placeholder="Selecionar status..."
          />
        </FiltroGrupo>
      )}

      {categorias.length > 0 && (
        <FiltroGrupo titulo="Categoria">
          {categorias.map((categoria) => (
            <Checkbox
              key={categoria}
              label={categoria}
              checked={filtros.categoria.includes(categoria)}
              onChange={() =>
                onChange({ ...filtros, categoria: alternarValor(filtros.categoria, categoria) })
              }
            />
          ))}
        </FiltroGrupo>
      )}

      {regioesTuristicas.length > 0 && (
        <FiltroGrupo titulo="Região turística">
          <MultiSelectDropdown
            options={regioesTuristicas.map(r => ({ value: r.id, label: r.nome }))}
            selected={filtros.regiaoTuristica}
            onChange={(selected) => onChange({ ...filtros, regiaoTuristica: selected })}
            placeholder="Selecionar regiões..."
          />
        </FiltroGrupo>
      )}

      <FiltroGrupo titulo="Valor (R$)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            placeholder="Mín."
            value={filtros.valorMin ?? ''}
            onChange={(e) =>
              onChange({
                ...filtros,
                valorMin: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={{ width: '50%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
          <input
            type="number"
            placeholder="Máx."
            value={filtros.valorMax ?? ''}
            onChange={(e) =>
              onChange({
                ...filtros,
                valorMax: e.target.value ? Number(e.target.value) : null,
              })
            }
            style={{ width: '50%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
          />
        </div>
      </FiltroGrupo>

      <FiltroGrupo titulo="Prazos">
        <Checkbox
          label="Processos vencendo em até 30 dias"
          checked={filtros.apenasVencendoEm30Dias}
          onChange={() =>
            onChange({ ...filtros, apenasVencendoEm30Dias: !filtros.apenasVencendoEm30Dias })
          }
        />
        <Checkbox
          label="Apenas contratos assinados"
          checked={filtros.apenasContratosAssinados}
          onChange={() =>
            onChange({ ...filtros, apenasContratosAssinados: !filtros.apenasContratosAssinados })
          }
        />
      </FiltroGrupo>

      <div style={{ paddingTop: 8, borderTop: '1px solid #eee', color: '#666' }}>
        {totalResultados} resultado{totalResultados === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function FiltroGrupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 6, color: '#333' }}>{titulo}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function MultiSelectDropdown<T extends number>({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleOption = (value: T) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const selectedLabels = options
    .filter((opt) => selected.includes(opt.value))
    .map((opt) => opt.label)
    .join(', ');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 10px',
          border: '1px solid #ddd',
          borderRadius: 6,
          cursor: 'pointer',
          background: '#fff',
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: '#999' }}>{placeholder}</span>
        ) : (
          <span style={{ fontSize: '12px' }}>{selectedLabels}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '10px' }}>▼</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            marginTop: 4,
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {options.map((option) => (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleOption(option.value);
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleOption(option.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
