// Tipos de autenticación Firebase
export type UsuarioAuth = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
};

export type ErrorAutenticacion = {
  code: string;
  message: string;
};

// Tipos de navegación
export type RootStackParamList = {
  Login: undefined;
  Jefes: { usuario: Usuario };
  Obras: { 
    jefeId: string;
    jefeNombre: string;
    usuario: Usuario;
  };
  Instalaciones: { 
    obraId: string;
    obraNombre: string;
    jefeNombre: string;
    usuario: Usuario;
  };
  ChecklistScreen: { 
    instalacionId: string;
    instalacionNombre: string;
    spreadsheetId: string;
    usuario: Usuario;
    obraNombre: string;
    jefeNombre: string;
    obraId: string;
  };
  GrupoChecklistScreen: {
    grupo: string;
    items: any[];
    spreadsheetId: string;
    instalacionNombre: string;
    usuario: Usuario;
    obraNombre: string;
    jefeNombre: string;
  };
};

// Enumeraciones
export enum RolUsuario {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  TECNICO = 'TECNICO'
}

export enum EstadoInstalacion {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA'
}

export enum EstadoObra {
  ACTIVO = 'ACTIVO',
  PAUSADO = 'PAUSADO',
  COMPLETADO = 'COMPLETADO',
  SUSPENDIDO = 'SUSPENDIDO'
}

export enum TipoInstalacion {
  ELECTRICA = 'ELECTRICA',
  HIDRAULICA = 'HIDRAULICA',
  CLIMATIZACION = 'CLIMATIZACION',
  OTROS = 'OTROS'
}

export enum EstadoItem {
  PENDIENTE = 'PENDIENTE',
  COMPLETADO = 'COMPLETADO',
  EN_PROGRESO = 'EN_PROGRESO'
}

// Interfaces principales
export interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
  rol: RolUsuario;
}

export interface JefeDeGrupo {
  id: string;
  nombre: string;
  email?: string;
}

export interface Obra {
  id: string;
  nombre: string;
  ubicacion?: string;
  estado?: string;
  spreadsheetId?: string;
}

export interface Instalacion {
  id: string;
  nombre: string;
  nombreAmigable?: string;
  tipo: TipoInstalacion;
  estado: EstadoItem;
  fechaInicio?: string;
  fechaFin?: string;
  notas?: string;
}

export interface ChecklistItem {
  id: string;
  descripcion: string;
  completado: boolean;
  observaciones?: string;
  unidad?: string;
  s_contrato?: string;
  fechapp?: string;
  cantidad?: number;
  fechaCompletado?: string;
  rowIndex?: number;
  meta?: string;
  actual?: string;
  subItems?: ChecklistItem[];
}

// Alias para compatibilidad
export interface Jefe extends JefeDeGrupo {}
export interface ItemChecklist extends ChecklistItem {}
