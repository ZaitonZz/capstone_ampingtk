export type Consultation = {
    id: number;
    scheduled_at: string;
    status: string;
};

export type Patient = {
    id: number;
    first_name: string;
    last_name: string;
    profile_photo_url?: string | null;
    middle_name?: string;
    date_of_birth: string;
    age?: number;
    gender: string;
    civil_status?: string;
    contact_number?: string;
    email?: string;
    address?: string;
    blood_type?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
    known_allergies?: string;
    created_at: string;
    updated_at: string;
    has_today_schedule?: boolean;
    consultations?: Consultation[];
};

export type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
};
