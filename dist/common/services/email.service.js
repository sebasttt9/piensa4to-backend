"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    configService;
    logger = new common_1.Logger('EmailService');
    transporter = null;
    enabled = false;
    constructor(configService) {
        this.configService = configService;
        this.initialize();
    }
    initialize() {
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
        }
        else {
            this.logger.warn(`Email provider '${provider}' not yet implemented`);
        }
    }
    async send(options) {
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
        }
        catch (error) {
            this.logger.error(`Failed to send email: ${options.subject}`, error);
            return false;
        }
    }
    async sendVerificationEmail(email, verificationToken) {
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
    async sendPasswordResetEmail(email, resetToken) {
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
    async sendAnalysisCompleted(email, datasetName, dashboardUrl) {
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
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '');
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map