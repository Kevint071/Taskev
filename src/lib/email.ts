import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to,
    subject: "Restablece tu contraseña",
    html: `<p>Recibimos una solicitud para restablecer tu contraseña.</p>
<p><a href="${resetUrl}">Haz clic aquí para elegir una nueva contraseña</a></p>
<p>Este enlace expira en una hora y solo puede usarse una vez. Si no solicitaste esto, ignora este correo.</p>`,
  });
}
