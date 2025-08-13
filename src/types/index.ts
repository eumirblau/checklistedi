export interface JefeDeGrupo {
  id: string;
  nombre: string;
  grupo: string;
  email?: string;
}

export interface Obra {
  id: string;
  nombre: string;
  jefe_id: string;
  spreadsheetId?: string;
}

export enum TipoInstalacion {
  OTROS = 'OTROS'
}

export interface Instalacion {
  id: string;
  nombre: string;
  obra_id: string;
  tipo_instalacion_id: string;
  nombreAmigable?: string;
  tipo?: TipoInstalacion;
  estado?: EstadoItem;
}

export enum EstadoItem {
  PENDIENTE = 'PENDIENTE',
  COMPLETADO = 'COMPLETADO'
}

export interface ChecklistItem {
  id: string;
  unidad: string;
  concepto: string;
  descripcion?: string;
  estado?: EstadoItem;
  observaciones?: string;
  fecha_revision?: string;
  revisado_por?: string;
  completado?: boolean;
  rowIndex?: number;
  s_contrato?: string;
  fechapp?: string;
  cantidad?: any;
  fechaCompletado?: string;
  meta?: any;
  actual?: any;
  subItems?: any[];
}
