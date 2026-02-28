const nodemailer = require("nodemailer");

// Configure the transporter for sending emails using Gmail and OAuth2
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Function to send email is used by other functions to send different types of emails (registration, transaction notifications, etc.)
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Backend Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// This function sends a welcome email to new users upon registration
async function sendRegistrationEmail(userEmail, name) {
  const subject = "Welcome to Backend Ledger!";
  const text = `Hi ${name},\n\nThank you for registering at Backend Ledger. We're excited to have you on board!\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Thank you for registering at Backend Ledger. We're excited to have you on board!</p><p>Best regards,<br>The Backend Ledger Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

// This function sends a transaction notification email to users when a transaction is completed
async function sendTransactionNotification(userEmail, transactionDetails) {
  const {
    type,
    amount,
    currency,
    fromAccount,
    toAccount,
    description,
    status,
  } = transactionDetails;
  const subject = `Transaction ${status}: ${type} of ${amount} ${currency}`;
  const text = `Hi,\n\nYou have a new transaction:\nType: ${type}\nAmount: ${amount} ${currency}\nFrom Account: ${fromAccount || "N/A"}\nTo Account: ${toAccount || "N/A"}\nDescription: ${description || "N/A"}\nStatus: ${status}\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hi,</p><p>You have a new transaction:</p><ul><li>Type: ${type}</li><li>Amount: ${amount} ${currency}</li><li>From Account: ${fromAccount || "N/A"}</li><li>To Account: ${
    toAccount || "N/A"
  }</li><li>Description: ${description || "N/A"}</li><li>Status: ${status}</li></ul><p>Best regards,<br>The Backend Ledger Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

// This function sends a transaction failure notification email to users when a transaction fails
async function sendTransactionFailureNotification(userEmail, transactionDetails, errorMessage) {
  const {
    type,
    amount,
    currency,
    fromAccount,
    toAccount,
    description,
  } = transactionDetails;
  const subject = `Transaction Failed: ${type} of ${amount} ${currency}`;
  const text = `Hi,\n\nYour transaction has failed:\nType: ${type}\nAmount: ${amount} ${currency}\nFrom Account: ${fromAccount || "N/A"}\nTo Account: ${toAccount || "N/A"}\nDescription: ${description || "N/A"}\nError: ${errorMessage}\n\nBest regards,\nThe Backend Ledger Team`;
  const html = `<p>Hi,</p><p>Your transaction has failed:</p><ul><li>Type: ${type}</li><li>Amount: ${amount} ${currency}</li><li>From Account: ${fromAccount || "N/A"}</li><li>To Account: ${
    toAccount || "N/A"
  }</li><li>Description: ${description || "N/A"}</li><li>Error: ${errorMessage}</li></ul><p>Best regards,<br>The Backend Ledger Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionNotification,
  sendTransactionFailureNotification,
};
