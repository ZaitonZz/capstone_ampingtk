export type ConsultationStatus =
    | 'pending'
    | 'scheduled'
    | 'ongoing'
    | 'completed'
    | 'cancelled'
    | 'no_show';
export type ConsultationType = 'in_person' | 'teleconsultation';

export interface PatientSummary {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
}

export interface DoctorSummary {
    id: number;
    name: string;
    doctor_profile?: {
        specialty?: string;
    };
}

export interface Consultation {
    id: number;
    patient_id: number;
    doctor_id: number;
    type: ConsultationType;
    status: ConsultationStatus;
    chief_complaint: string | null;
    scheduled_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    session_token: string | null;
    deepfake_verified: boolean | null;
    cancellation_reason: string | null;
    duration_minutes: number | null;
    patient?: PatientSummary;
    doctor?: DoctorSummary;
    created_at: string;
    updated_at: string;
}

export interface CalendarEvent {
    id: number;
    title: string;
    start: string;
    end: string | null;
    extendedProps: {
        status: ConsultationStatus;
        type: ConsultationType;
        chief_complaint: string | null;
        doctor_name?: string | null;
        specialty?: string | null;
        consultation_id: number;
    };
}

export interface PaginatedConsultations {
    data: Consultation[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

export interface ConsultationConsent {
    id: number;
    consultation_id: number;
    user_id: number;
    consent_confirmed: boolean;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
}
