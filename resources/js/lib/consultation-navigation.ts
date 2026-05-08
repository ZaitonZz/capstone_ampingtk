import * as ConsultationController from '@/actions/App/Http/Controllers/ConsultationController';
import * as PatientConsultationController from '@/actions/App/Http/Controllers/PatientConsultationController';

export function consultationIndexUrlForRole(role?: string | null): string {
    return role === 'patient'
        ? PatientConsultationController.index.url()
        : ConsultationController.index.url();
}

export function consultationDetailsUrlForRole(
    role: string | null | undefined,
    consultationId: number,
): string {
    return role === 'patient'
        ? PatientConsultationController.show.url(consultationId)
        : ConsultationController.show.url(consultationId);
}
