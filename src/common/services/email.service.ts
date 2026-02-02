import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
}

@Injectable()
export class EmailService {
    private logger = new Logger('EmailService');
    private transporter: nodemailer.Transporter | null = null;
    private enabled = false;

    constructor(private configService: ConfigService) {
        this.initialize();
    }

    private initialize() {
        const emailEnabled = this.configService.get('email.enabled', false);
        if (!emailEnabled) {
            this.logger.warn('Email service is disabled. Configure EMAIL_ENABLED=true to enable.');
            return;
        }

        const provider = this.configService.get('email.provider', 'smtp');
        const smtpConfig = this.configService.get('email.smtp');

        if (provider === 'smtp') {
            this.transporter = nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: {
                    user: smtpConfig.user,
                    pass: smtpConfig.password,
                },
            });
            this.enabled = true;
            this.logger.log(`Email service initialized with SMTP provider (${smtpConfig.host})`);
        } else {
            this.logger.warn(`Email provider '${provider}' not yet implemented`);
        }
    }

    async send(options: EmailOptions): Promise<boolean> {
        if (!this.enabled || !this.transporter) {
            this.logger.warn(`Email not sent (disabled): ${options.subject}`);
            return false;
        }

        try {
            const smtpConfig = this.configService.get('email.smtp');
            const mailOptions = {
                from: options.from || smtpConfig.from,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || this.stripHtml(options.html),
            };

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent: ${options.to} (${options.subject})`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email: ${options.subject}`, error);
            return false;
        }
    }

    /**
     * Send email verification
     */
    async sendVerificationEmail(email: string, verificationToken: string): Promise<boolean> {
        const verificationUrl = `${process.env.APP_URL}/auth/verify?token=${verificationToken}`;

        return this.send({
            to: email,
            subject: 'Verifica tu correo electrónico - DataPulse',
            html: `
        <h2>Bienvenido a DataPulse</h2>
        <p>Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
        <a href="${verificationUrl}">Verificar correo</a>
        <p>Este enlace expira en 24 horas.</p>
      `,
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
        const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`;

        return this.send({
            to: email,
            subject: 'Restablecer contraseña - DataPulse',
            html: `
        <h2>Solicitud de restablecimiento de contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
        <a href="${resetUrl}">Restablecer contraseña</a>
        <p>Este enlace expira en 1 hora.</p>
        <p>Si no solicitaste esto, ignora este correo.</p>
      `,
        });
    }

    /**
     * Send analysis completed notification
     */
    async sendAnalysisCompleted(email: string, datasetName: string, dashboardUrl: string): Promise<boolean> {
        return this.send({
            to: email,
            subject: `Análisis completado: ${datasetName} - DataPulse`,
            html: `
        <h2>Tu análisis está listo</h2>
        <p>El análisis de <strong>${datasetName}</strong> ha sido completado exitosamente.</p>
        <p><a href="${dashboardUrl}">Ver dashboard</a></p>
      `,
        });
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '');
    }
}
