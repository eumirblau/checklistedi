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
    
    // Simular que todos los jefes tienen obras
    return [
      {
        id: '1',
        nombre: `Obra de ${jefeNombre}`,
        ubicacion: 'Madrid',
        estado: 'ACTIVA'
      }
    ];
  }
};

export default ApiServiceMock;
