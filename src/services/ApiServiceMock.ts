// Mock de ApiService para testing
export const ApiServiceMock = {
  async getJefesDeGrupo() {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        id: '1',
        nombre: 'Juan Pérez',
        email: 'juan.perez@edhinor.com',
        telefono: '+34 600 123 456',
        activo: true
      },
      {
        id: '2', 
        nombre: 'María García',
        email: 'maria.garcia@edhinor.com',
        telefono: '+34 600 789 012',
        activo: true
      },
      {
        id: '3',
        nombre: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@edhinor.com', 
        telefono: '+34 600 345 678',
        activo: true
      }
    ];
  },

  async getObrasPorJefe(jefeNombre: string) {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simular diferentes obras según el jefe
    const obras = [
      {
        id: 'OBR001',
        nombre: `Proyecto Residencial ${jefeNombre}`,
        ubicacion: 'Madrid Centro',
        estado: 'ACTIVA',
        descripcion: 'Instalación eléctrica completa',
        spreadsheetId: 'mock-spreadsheet-1'
      },
      {
        id: 'OBR002', 
        nombre: `Centro Comercial ${jefeNombre}`,
        ubicacion: 'Las Rozas',
        estado: 'ACTIVA',
        descripcion: 'Sistema eléctrico comercial',
        spreadsheetId: 'mock-spreadsheet-2'
      },
      {
        id: 'OBR003',
        nombre: `Hospital ${jefeNombre}`,
        ubicacion: 'Alcobendas',
        estado: 'ACTIVA', 
        descripcion: 'Instalación hospitalaria crítica',
        spreadsheetId: 'mock-spreadsheet-3'
      }
    ];

    return obras;
  }
};

export default ApiServiceMock;
