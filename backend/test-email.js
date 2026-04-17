import { sendEmail } from './src/services/emailService.js';

async function testEmail() {
  try {
    console.log('Testing email service...');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Invoice Email',
      text: 'This is a test email with invoice attachment.',
      html: '<p>This is a test email with invoice attachment.</p>',
      attachments: []
    });
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email test failed:', error.message);
  }
}

testEmail();