import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders, utils


class MailService:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.server = smtplib.SMTP(host, port)
        self.server.starttls()
        self.server.login(username, password)

    def send_mail(self, sender, recipients, subject, body, attachments=None):
        message = MIMEMultipart()
        message["From"] = sender
        message["To"] = ", ".join(recipients)
        message["Subject"] = subject
        message["Message-ID"] = utils.make_msgid()
        message.attach(MIMEText(body, 'html'))

        if attachments:
            for attachment in attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment["data"])
                encoders.encode_base64(part)
                part.add_header("Content-Disposition", f"attachment; filename= {attachment['filename']}")
                message.attach(part)

        self.server.sendmail(sender, recipients, message.as_string())

    def close_connection(self):
        self.server.quit()


if __name__ == '__main__':
    # Instantiate the mail service
    mail_service = MailService(host="wp13348647.mailout.server-he.de",
                               port=587,
                               username="wp13348647-info",
                               password="ungarn01")

    # Compose and send the email
    sender = "info@data-science-architect.de"
    recipients = ["andreasw5583@gmail.com"]
    subject = "Hello from the mail service"

    body = "Please click on the following link and use the code to complete 2-factor authentication:<br>"
    body += "<a href='https://data-science-architect.de/'>Go to login!</a><br>"
    body += "Code: 123456"

    attachments = [
        {
            'filename': 'attachment1.txt',
            'data': b'This is the data of attachment1'
        }
    ]
    mail_service.send_mail(sender=sender, recipients=recipients, subject=subject, body=body, attachments=attachments)


    # Close the connection to the mail server
    mail_service.close_connection()
