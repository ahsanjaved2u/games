const nodemailer = require('nodemailer');

// ─── Transporter ─────────────────────────────────────────────────
// All config via .env:
//   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE,
//   EMAIL_USER, EMAIL_PASS, EMAIL_FROM_NAME,
//   ADMIN_EMAIL

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const from = () =>
  `"${process.env.EMAIL_FROM_NAME || 'GameVesta'}" <${process.env.EMAIL_USER}>`;

const send = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await transporter.sendMail({ from: from(), to, subject, html });
  } catch (err) {
    console.error('[mailer]', err.message);
  }
};

// ─── HTML shell ──────────────────────────────────────────────────
const shell = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{margin:0;padding:0;background:#0b0b1a;font-family:Arial,Helvetica,sans-serif;color:#e0e0e0}
.wrap{max-width:560px;margin:40px auto;background:#12122a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
.hdr{background:linear-gradient(135deg,#00e5ff,#a855f7);padding:28px 32px}
.hdr h1{margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:.5px}
.bdy{padding:28px 32px}
.amt{font-size:28px;font-weight:900;color:#ffd93d;margin:12px 0}
.card{background:rgba(255,255,255,.04);border-radius:10px;padding:14px 18px;margin:14px 0;font-size:13px;line-height:1.8;border:1px solid rgba(255,255,255,.07)}
.tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
.tag-g{background:rgba(0,255,136,.12);color:#00ff88;border:1px solid rgba(0,255,136,.25)}
.tag-r{background:rgba(255,45,120,.12);color:#ff5c8a;border:1px solid rgba(255,45,120,.25)}
.tag-y{background:rgba(255,217,61,.12);color:#ffd93d;border:1px solid rgba(255,217,61,.25)}
.ftr{padding:18px 32px;font-size:11px;color:rgba(255,255,255,.3);border-top:1px solid rgba(255,255,255,.06)}
.muted{color:rgba(255,255,255,.4)}
.small{font-size:12px;color:rgba(255,255,255,.4)}
td{padding:2px 0}
</style></head><body><div class="wrap">${body}</div></body></html>`;

// ─── Templates ───────────────────────────────────────────────────

const methodLabel = (m) =>
  ({ bank: '🏦 Bank Transfer', easypaisa: '📱 EasyPaisa', jazzcash: '📲 JazzCash' }[m] || m || '-');

const row = (label, val) =>
  val ? `<tr>
    <td class="muted" style="padding:4px 16px 4px 0;vertical-align:top;white-space:nowrap">${label}</td>
    <td style="padding:4px 0;font-weight:600;color:#e0e0e0">${val}</td>
  </tr>` : '';

const detailRows = (pm, note) =>
  [
    row('Bank Name',      pm.bankName),
    row('Account Title',  pm.accountTitle),
    row('Account #',      pm.accountNumber),
    row('Card Holder',    pm.cardHolderName),
    row('Card #',         pm.cardNumber),
    row('Phone',          pm.phoneNumber),
    row('Note',           note),
  ].join('');

const ts = () => new Date().toUTCString();

// ── 1. Player requests withdrawal → email admin ─────────────────
const sendWithdrawalRequestToAdmin = async (player, amount, paymentMethod, note) => {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  const pm = paymentMethod || {};
  await send({
    to,
    subject: `💸 Withdrawal Request — PKR ${amount} from ${player.name}`,
    html: shell(`
      <div class="hdr"><h1>💸 New Withdrawal Request</h1></div>
      <div class="bdy">
        <p>A player has requested a withdrawal.</p>
        <div class="amt">PKR ${Number(amount).toLocaleString()}</div>
        <div class="card">
          <table style="border-collapse:collapse;width:100%">
            ${row('Name',     player.name)}
            ${row('Email',    player.email)}
            ${row('Username', player.username)}
          </table>
        </div>
        <div class="card">
          <span class="tag tag-y">${methodLabel(pm.method)}</span>
          <table style="margin-top:10px;border-collapse:collapse;width:100%">${detailRows(pm, note)}</table>
        </div>
        <p class="small">Log in to Admin Dashboard → Wallet Management to approve or reject.</p>
      </div>
      <div class="ftr">GameVesta Admin · ${ts()}</div>`),
  });
};

// ── 2. Admin approves → email player ────────────────────────────
const sendWithdrawalApprovedToPlayer = async (playerEmail, playerName, amount) => {
  await send({
    to: playerEmail,
    subject: `✅ Withdrawal Approved — PKR ${amount}`,
    html: shell(`
      <div class="hdr"><h1>✅ Withdrawal Approved</h1></div>
      <div class="bdy">
        <p>Hi <strong>${playerName}</strong>,</p>
        <p>Your withdrawal has been <span class="tag tag-g">Approved</span> and payment processed.</p>
        <div class="amt">PKR ${Number(amount).toLocaleString()}</div>
        <p style="font-size:13px;color:rgba(255,255,255,.5)">
          Allow 1–2 business days for the amount to reflect in your account.
        </p>
      </div>
      <div class="ftr">GameVesta · ${ts()}</div>`),
  });
};

// ── 3. Admin rejects → email player ─────────────────────────────
const sendWithdrawalRejectedToPlayer = async (playerEmail, playerName, amount) => {
  await send({
    to: playerEmail,
    subject: `❌ Withdrawal Rejected — PKR ${amount} Refunded`,
    html: shell(`
      <div class="hdr"><h1>❌ Withdrawal Rejected</h1></div>
      <div class="bdy">
        <p>Hi <strong>${playerName}</strong>,</p>
        <p>Your withdrawal has been <span class="tag tag-r">Rejected</span>.</p>
        <div class="amt">PKR ${Number(amount).toLocaleString()}</div>
        <p style="font-size:13px;color:rgba(255,255,255,.5)">
          The full amount has been <strong style="color:#00ff88">refunded to your wallet</strong>.
          You can submit a new request at any time.
        </p>
      </div>
      <div class="ftr">GameVesta · ${ts()}</div>`),
  });
};

// ── 4. Email verification code ──────────────────────────────────
const sendVerificationCode = async (playerEmail, playerName, code) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyLink = `${siteUrl}/verify-email?code=${code}`;
  await send({
    to: playerEmail,
    subject: `🔐 Your Verification Code — ${code}`,
    html: shell(`
      <div class="hdr"><h1>🔐 Email Verification</h1></div>
      <div class="bdy">
        <p>Hi <strong>${playerName}</strong>,</p>
        <p>Use this code to verify your email:</p>
        <div class="amt">${code}</div>
        <p style="margin:18px 0">
          <a href="${verifyLink}" style="display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#00e5ff,#a855f7);color:#fff;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:.5px">✅ Verify My Email</a>
        </p>
        <p style="font-size:13px;color:rgba(255,255,255,.5)">
          This code expires in <strong>7 days</strong>. If you didn't sign up, ignore this email.
        </p>
      </div>
      <div class="ftr">GameVesta · ${ts()}</div>`),
  });
};

// ── 5. Contact form → email admin ───────────────────────────────
const sendContactEmail = async (name, email, subject, message) => {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  await send({
    to,
    subject: `📩 Contact: ${subject}`,
    html: shell(`
      <div class="hdr"><h1>📩 New Contact Message</h1></div>
      <div class="bdy">
        <div class="card">
          <table style="border-collapse:collapse;width:100%">
            ${row('Name', name)}
            ${row('Email', email)}
            ${row('Subject', subject)}
          </table>
        </div>
        <div class="card" style="white-space:pre-wrap">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <p class="small">Reply directly to <strong style="color:#00e5ff">${email}</strong></p>
      </div>
      <div class="ftr">GameVesta · ${ts()}</div>`),
  });
};

// ── 6. Password reset code ──────────────────────────────────────
const sendPasswordResetCode = async (playerEmail, playerName, code) => {
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${siteUrl}/forgot-password?email=${encodeURIComponent(playerEmail)}&code=${code}`;
  await send({
    to: playerEmail,
    subject: `🔑 Your Password Reset Code — ${code}`,
    html: shell(`
      <div class="hdr"><h1>🔑 Reset Your Password</h1></div>
      <div class="bdy">
        <p>Hi <strong>${playerName}</strong>,</p>
        <p>We received a request to reset your password. Use this code:</p>
        <div class="amt">${code}</div>
        <p style="margin:28px 0;text-align:center">
          <a href="${resetLink}" style="display:inline-block;padding:16px 48px;border-radius:12px;background:linear-gradient(135deg,#00e5ff,#a855f7);color:#fff;font-weight:800;font-size:16px;text-decoration:none;letter-spacing:.5px;box-shadow:0 4px 20px rgba(0,229,255,.3)">🔐 Reset My Password</a>
        </p>
        <p style="font-size:13px;color:rgba(255,255,255,.5)">
          This code expires in <strong>1 hour</strong>. If you didn't request a password reset, ignore this email — your password will remain unchanged.
        </p>
      </div>
      <div class="ftr">GameVesta · ${ts()}</div>`),
  });
};

module.exports = {
  sendWithdrawalRequestToAdmin,
  sendWithdrawalApprovedToPlayer,
  sendWithdrawalRejectedToPlayer,
  sendVerificationCode,
  sendContactEmail,
  sendPasswordResetCode,
};
