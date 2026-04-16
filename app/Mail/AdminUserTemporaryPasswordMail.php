<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminUserTemporaryPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $recipientName,
        public readonly string $recipientEmail,
        public readonly string $role,
        public readonly string $temporaryPassword,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            to: [new Address($this->recipientEmail, $this->recipientName)],
            from: new Address(
                config('mail.from.address', 'noreply@ampingtk.local'),
                config('mail.from.name', 'AMPING_TK')
            ),
            subject: 'Your AMPING_TK account is ready',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-user-temporary-password',
            with: [
                'recipientName' => $this->recipientName,
                'role' => $this->role,
                'temporaryPassword' => $this->temporaryPassword,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
