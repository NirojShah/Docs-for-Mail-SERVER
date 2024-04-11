const express = require('express');
const app = express();
const port = 3000;
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const nodemailer = require('nodemailer');

// User sessions (in a real app, use a more secure method to manage sessions)
const sessions = {};

app.use(express.json());

// Login endpoint for 10 users
app.post('/login/:username', (req, res) => {
    const { username } = req.params;
    const { password } = req.body;

    // Authenticate user (e.g., check username/password against a database)
    // In a real app, use a secure method to authenticate users
    if (password === `password${username.slice(-1)}`) {
        // Create a new IMAP connection for the user
        const imap = new Imap({
            user: username,
            password: password,
            host: 'localhost',
            port: 143,
            tls: false,
        });

        // Store the IMAP connection in the session
        sessions[username] = { imap };

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    console.error('Error opening INBOX:', err);
                    return res.status(500).send('Error fetching emails');
                }

                // Listen for new emails
                imap.on('mail', (numNewMsgs) => {
                    sendNotificationEmail(username);
                });

                res.send('Login successful');
            });
        });

        imap.once('error', (err) => {
            console.error('IMAP error:', err);
            res.status(500).send('Error logging in');
        });

        imap.connect();
    } else {
        res.status(401).send('Unauthorized');
    }
});

function sendNotificationEmail(username) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
            user: 'your-email@example.com',
            pass: 'your-password',
        },
    });

    const mailOptions = {
        from: 'your-email@example.com',
        to: username + '@example.com', // assuming username is the email prefix
        subject: 'New Email Notification',
        text: 'You have a new email in your inbox.',
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending notification email:', err);
        } else {
            console.log('Notification email sent:', info.response);
        }
    });
}

// Sending mail endpoint for 4 users
app.post('/sendmail/:username', (req, res) => {
    const { username } = req.params;
    const { to, subject, text } = req.body;

    const transporter = nodemailer.createTransport({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
            user: username + '@example.com', // assuming username is the email prefix
            pass: 'password' + username.slice(-1), // assuming password is 'password' + last digit of username
        },
    });

    const mailOptions = {
        from: username + '@example.com',
        to: to,
        subject: subject,
        text: text,
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            res.status(500).send('Error sending email');
        } else {
            console.log('Email sent:', info.response);
            res.send('Email sent');
        }
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
