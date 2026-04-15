<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConsultationIdentityOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly int $consultationId,
        public readonly string $recipientEmail,
        public readonly string $recipientName,
        public readonly string $targetRole,
        public readonly string $otp,
        public readonly int $expiryMinutes = 5,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            to: [new Address($this->recipientEmail, $this->recipientName)],
            from: new Address(
                config('mail.from.address', 'noreply@ampingtk.local'),
                config('mail.from.name', 'AMPING_TK')
            ),
            subject: 'Consultation Identity Verification Code',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.consultation-identity-otp',
            with: [
                'consultationId' => $this->consultationId,
                'targetRole' => $this->targetRole,
                'otp' => $this->otp,
                'expiryMinutes' => $this->expiryMinutes,
                'recipientName' => $this->recipientName,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
