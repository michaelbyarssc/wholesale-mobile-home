import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface AppointmentConfirmationProps {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  appointmentType: string
  locationType: string
  locationAddress?: string
  mobileHomeName?: string
  specialRequests?: string
  confirmationToken: string
  businessName?: string
  businessLogo?: string
  businessPhone?: string
  businessEmail?: string
}

export const AppointmentConfirmationEmail = ({
  customerName,
  appointmentDate,
  appointmentTime,
  appointmentType,
  locationType,
  locationAddress,
  mobileHomeName,
  specialRequests,
  confirmationToken,
  businessName = "Mobile Home Solutions",
  businessLogo,
  businessPhone,
  businessEmail,
}: AppointmentConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Your appointment is confirmed for {appointmentDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          {businessLogo && (
            <Img
              src={businessLogo}
              width="120"
              height="60"
              alt={businessName}
              style={logo}
            />
          )}
          <Heading style={h1}>{businessName}</Heading>
        </Section>

        <Section style={content}>
          <div style={confirmationBadge}>
            ✅ Appointment Confirmed
          </div>
          
          <Heading style={h2}>Your Appointment is Confirmed!</Heading>
          
          <Text style={paragraph}>
            Dear {customerName},
          </Text>
          
          <Text style={paragraph}>
            Thank you for scheduling an appointment with us. We're excited to help you with your mobile home needs!
          </Text>

          <Section style={appointmentBox}>
            <Heading style={h3}>Appointment Details</Heading>
            
            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>📅 Date:</Text>
              </Column>
              <Column>
                <Text style={value}>{appointmentDate}</Text>
              </Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>🕐 Time:</Text>
              </Column>
              <Column>
                <Text style={value}>{appointmentTime}</Text>
              </Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>📋 Type:</Text>
              </Column>
              <Column>
                <Text style={value}>{appointmentType}</Text>
              </Column>
            </Row>
            
            <Row style={detailRow}>
              <Column style={labelColumn}>
                <Text style={label}>📍 Location:</Text>
              </Column>
              <Column>
                <Text style={value}>
                  {locationType === 'customer_site' ? 'At your location' : 'Our showroom'}
                  {locationAddress && (
                    <>
                      <br />
                      <span style={addressText}>{locationAddress}</span>
                    </>
                  )}
                </Text>
              </Column>
            </Row>
            
            {mobileHomeName && (
              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>🏠 Home:</Text>
                </Column>
                <Column>
                  <Text style={value}>{mobileHomeName}</Text>
                </Column>
              </Row>
            )}
            
            {specialRequests && (
              <Row style={detailRow}>
                <Column style={labelColumn}>
                  <Text style={label}>📝 Notes:</Text>
                </Column>
                <Column>
                  <Text style={value}>{specialRequests}</Text>
                </Column>
              </Row>
            )}
            
            <Hr style={divider} />
            
            <Text style={confirmationCode}>
              Confirmation Code: <strong>{confirmationToken}</strong>
            </Text>
          </Section>

          <Section style={preparationBox}>
            <Heading style={h3}>What to Expect</Heading>
            <ul style={expectationList}>
              <li style={expectationItem}>Our representative will arrive on time and prepared</li>
              <li style={expectationItem}>We'll discuss your needs and preferences in detail</li>
              <li style={expectationItem}>You'll get expert advice on mobile home options</li>
              <li style={expectationItem}>We'll provide you with detailed information and pricing</li>
            </ul>
          </Section>

          <Section style={actionSection}>
            <Text style={paragraph}>
              <strong>Need to make changes?</strong>
            </Text>
            <Text style={paragraph}>
              If you need to reschedule or cancel your appointment, please contact us at least 24 hours in advance.
            </Text>
          </Section>

          <Text style={paragraph}>
            We look forward to meeting with you and helping you find the perfect mobile home solution!
          </Text>

          <Text style={signature}>
            Best regards,<br />
            The {businessName} Team
          </Text>
        </Section>

        <Hr style={footerDivider} />

        <Section style={footer}>
          {businessPhone && (
            <Text style={footerText}>
              📞 <Link href={`tel:${businessPhone}`} style={footerLink}>{businessPhone}</Link>
            </Text>
          )}
          {businessEmail && (
            <Text style={footerText}>
              ✉️ <Link href={`mailto:${businessEmail}`} style={footerLink}>{businessEmail}</Link>
            </Text>
          )}
          
          <Text style={footerText}>
            This confirmation was sent for your scheduled appointment.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AppointmentConfirmationEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 32px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
}

const logo = {
  margin: '0 auto 16px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0',
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const h3 = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 12px',
}

const content = {
  padding: '32px',
}

const confirmationBadge = {
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  padding: '8px 16px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
  border: '1px solid #22c55e',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const appointmentBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const detailRow = {
  margin: '12px 0',
}

const labelColumn = {
  width: '120px',
  verticalAlign: 'top',
}

const label = {
  color: '#475569',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const value = {
  color: '#1e293b',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.4',
}

const addressText = {
  color: '#64748b',
  fontSize: '13px',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '20px 0',
}

const confirmationCode = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  textAlign: 'center' as const,
  backgroundColor: '#fef3c7',
  padding: '12px',
  borderRadius: '6px',
  margin: '16px 0 0',
}

const preparationBox = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #bae6fd',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const expectationList = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '12px 0',
  paddingLeft: '20px',
}

const expectationItem = {
  margin: '6px 0',
}

const actionSection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '24px 0 0',
}

const footerDivider = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  padding: '0 32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0',
}

const footerLink = {
  color: '#2563eb',
  textDecoration: 'none',
}