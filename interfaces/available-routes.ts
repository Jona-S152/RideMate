// 1. Tipos base para las paradas (stops)

// Paradas de la tabla 'routes' (estáticas)
export interface RouteStop {
    id: number; // Es el stop ID
    location: string;
    coords: Coords;
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

export interface Coords {
    coordinates: number[];
    crs: {
        properties: {};
        type: string;
    };
}

// Estructura de la tabla 'routes' (Modo Conductor)
export interface RouteCompanyData {
    id: number;
    start_location: string;
    end_location: string;
    start_coords: Coords;
    end_coords: Coords;
    // Propiedad Única 1
    stops: RouteStop[]; 
    image_url: string;
    organization_id?: number | null;
    branch_id?: number | null;
}

export interface RouteData {
    id: number;
    start_location: string;
    end_location: string;
    start_coords: Coords;
    end_coords: Coords;
    // Propiedad Única 1
    stops: RouteStop[]; 
    image_url: string;
    organization_id?: number | null;
    branch_id?: number | null;
}

// Estructura de la tabla 'trip_sessions' (Modo Pasajero)
export interface SessionData {
    id: number;
    route_id: number;
    driver_id: string; // UUID
    status: string;
    start_location: string;
    end_location: string;
    start_coords: Coords;
    end_coords: Coords;
    created_at: Date;
    // Propiedad Única 2
    trip_session_stops: SessionStop[]; 
    organization_id?: number | null;
    branch_id?: number | null;
}

export interface RouteHistory {
    id: number;
    user_id: string; // uuid
    trip_session_id: number;
    route_id: number;
    start_location: string;
    end_location: string;
    start_coords?: Coords;
    end_coords?: Coords;
    start_time: string;
    end_time: string;
    rating: number | null;
    driver_rating: number | null;
    comment: string | null;
    stops: any; // jsonb, mejor tiparlo como un array si es necesario
}

export interface PassengerTripSession {
  id: number;
  trip_session_id: number;
  passenger_id: string;
  status: string;
  rejected: boolean;
  rejection_reason?: string | null;
  created_at: string;
}

export interface UserData {
    id: string;
    name: string;
    email: string;
    role_id: number; 
    phone_number: string;
    created_at: Date;
    last_name: string;
    is_driver: boolean;
    display_name: string;
    avatar_profile: string;
    rating?: number;
    rating_count?: number;
    city_id?: number | null;
    status?: 'active' | 'inactive' | 'blocked' | null;
    last_seen_at?: string | null;
}

export interface DriverInfo {
    name: string,
    avatar: string,
    rating: number
}

export interface TripSessionStops {
    id: number;
    trip_session_id: number;
    stop_id: number;
    status: string;
    visit_time: Date;
    create_at: Date;
    passenger_id: string;
    passenger_stop_id: number;
}

export interface TripSessionMeetingPoints {
    id: number;
    trip_session_id: number;
    passenger_id: string;
    passenger_mp_id: number;
    status: string;
    visit_time: Date;
    create_at: Date;
}

export interface StopData {
    id: number;
    route_id: number;
    location: string;
    coords: {latitude: number, longitude: number};
    stop_order: number;
    created_at: Date;
}

export interface Passenger_Stops {
    id: number;
    trip_session_id: number;
    passenger_id: string;
    location: string;
    coords: {latitude: number, longitude: number};
    created_at: string;
}

export interface DriverLocation {
    trip_session_id: number;
    driver_id: string;
    coords: {latitude: number, longitude: number};
    recorded_at: Date;
}

export interface MeetingPoint {
    id: number;
    trip_session_id: number;
    passenger_id: string;
    location: string;
    coords: {latitude: number, longitude: number};
    created_at: string;
}

export interface City {
    id: number;
    name: string;
    state?: string | null;
    country_code: string;
    timezone: string;
    created_at?: string;
}

export interface Organization {
    id: number;
    name: string;
    slug: string;
    organization_type: 'university' | 'company' | 'school' | 'hospital' | 'government' | 'industrial_park';
    logo_url?: string | null;
    city_id?: number | null;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
}

export interface OrganizationBranch {
    id: number;
    organization_id: number;
    name: string;
    address?: string | null;
    location?: Coords;
    created_at?: string;
}

export interface OrganizationMember {
    id: number;
    organization_id: number;
    user_id: string;
    role: 'admin' | 'member' | 'driver';
    status: 'active' | 'inactive' | 'suspended';
    joined_at?: string;
    created_at?: string;
}

export interface PassengerRequest {
    id: number;
    organization_id: number;
    trip_session_id: number;
    passenger_id: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    rejection_reason?: string | null;
    pickup_point: Coords;
    pickup_address?: string | null;
    destination_point: Coords;
    destination_address?: string | null;
    requested_at?: string;
    resolved_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

// 3. INTERFAZ UNIFICADA para el estado 'routes'
// Permite que el estado sea cualquiera de los dos tipos
export type AvailableRoute = RouteData | SessionData;