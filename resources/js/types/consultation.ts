export type ConsultationStatus =
    | 'pending'
    | 'scheduled'
    | 'ongoing'
    | 'paused'
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

export type MicrocheckStatus = 'pending' | 'claimed' | 'completed' | 'expired';

export interface ConsultationMicrocheck {
    id: number;
    consultation_id: number;
    cycle_key: string | null;
    target_role: 'patient' | 'doctor' | null;
    status: MicrocheckStatus;
    scheduled_at: string;
    claimed_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
    latency_ms: number | null;
    created_at: string;
    updated_at: string;
}

export interface DeepfakeScanLog {
    id: number;
    consultation_id: number;
    microcheck_id: number | null;
    user_id: number | null;
    verified_role: 'patient' | 'doctor' | null;
    result: 'real' | 'fake' | 'inconclusive';
    confidence_score: number | null;
    frame_path: string | null;
    frame_number: number | null;
    model_version: string | null;
    flagged: boolean;
    scanned_at: string | null;
    detected_user?: {
        id: number;
        name: string;
    } | null;
}

export interface ConsultationDeepfakeEscalation {
    id: number;
    consultation_id: number;
    triggered_by_user_id: number | null;
    triggered_role: 'patient' | 'doctor';
    type: 'admin_alert' | 'doctor_decision' | 'otp_verification';
    streak_count: number;
    status: 'open' | 'resolved';
    decision: 'continue' | 'cancel' | null;
    resolved_by: number | null;
    resolved_at: string | null;
    notes: string | null;
    triggered_by?: {
        id: number;
        name: string;
    } | null;
    resolver?: {
        id: number;
        name: string;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface Consultation {
    id: number;
    patient_id: number;
    doctor_id: number;
    type: ConsultationType;
    status: ConsultationStatus;
    status_before_pause: ConsultationStatus | null;
    chief_complaint: string | null;
    scheduled_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    session_token: string | null;
    livekit_room_name: string | null;
    livekit_room_sid: string | null;
    livekit_room_status: string | null;
    livekit_room_created_at: string | null;
    livekit_last_activity_at: string | null;
    livekit_ended_at: string | null;
    livekit_last_error: string | null;
    deepfake_verified: boolean | null;
    identity_verification_target_user_id: number | null;
    identity_verification_target_role: 'patient' | 'doctor' | null;
    identity_verification_started_at: string | null;
    identity_verification_expires_at: string | null;
    identity_verification_attempts: number;
    identity_verification_resend_available_at: string | null;
    next_microcheck_due_at?: string | null;
    avg_microcheck_latency_ms?: number | null;
    latest_microcheck?: ConsultationMicrocheck | null;
    cancellation_reason: string | null;
    duration_minutes: number | null;
    patient?: PatientSummary;
    doctor?: DoctorSummary;
    microchecks?: ConsultationMicrocheck[];
    deepfake_scan_logs?: DeepfakeScanLog[];
    deepfake_escalations?: ConsultationDeepfakeEscalation[];
    created_at: string;
    updated_at: string;
}

export interface ConsultationIdentityVerificationState {
    is_paused: boolean;
    is_current_user_target: boolean;
    target_role: 'patient' | 'doctor' | null;
    otp_length?: number;
    started_at?: string | null;
    expires_at?: string | null;
    attempts?: number;
    resend_available_at?: string | null;
    verify_url?: string;
    resend_url?: string;
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
