// 1. Tipos base para las paradas (stops)

// Paradas de la tabla 'routes' (estáticas)
export interface RouteStop {
    id: number; // Es el stop ID
    location: string;
    latitude: number;
    longitude: number;
    stop_order: number;
}

// Paradas de la tabla 'trip_session_stops' (dinámicas)
export interface SessionStop {
    id: number; // Es la PK del stop de la sesión
    stop_id: number; // Referencia al ID de la parada original
    status: string;
    visit_time: string | null;
}

// 2. Tipos base para las rutas/sesiones

// Estructura de la tabla 'routes' (Modo Conductor)
export interface RouteData {
    id: number;
    start_location: string;
    end_location: string;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    // Propiedad Única 1
    stops: RouteStop[]; 
}

// Estructura de la tabla 'trip_sessions' (Modo Pasajero)
export interface SessionData {
    id: number;
    route_id: number;
    driver_id: string; // UUID
    status: string;
    start_location: string;
    end_location: string;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    // Propiedad Única 2
    trip_session_stops: SessionStop[]; 
}

export interface RouteHistory {
    id: number;
    user_id: string; // uuid
    trip_session_id: number;
    route_id: number;
    start_location: string;
    end_location: string;
    start_time: string;
    end_time: string;
    rating: number | null;
    driver_rating: number | null;
    comment: string | null;
    stops: any; // jsonb, mejor tiparlo como un array si es necesario
}

// 3. INTERFAZ UNIFICADA para el estado 'routes'
// Permite que el estado sea cualquiera de los dos tipos
export type AvailableRoute = RouteData | SessionData;