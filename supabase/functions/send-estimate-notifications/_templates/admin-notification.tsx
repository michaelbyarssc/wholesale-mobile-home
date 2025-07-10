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

interface AdminNotificationProps {
  customerName: string
  customerEmail: string
  customerPhone: string
  estimateDetails: string
  totalAmount: number
  approvalUrl: string
  businessName?: string
  businessLogo?: string
}

export const AdminNotificationEmail = ({
  customerName,
  customerEmail,
  customerPhone,
  estimateDetails,
  totalAmount,
  approvalUrl,
  businessName = "Mobile Home Solutions",
  businessLogo,
}: AdminNotificationProps) => (
  <Html>
    <Head />
    <Preview>New estimate request from {customerName}</Preview>
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
          <Heading style={h1}>{businessName} - Admin Portal</Heading>
        </Section>

        <Section style={content}>
          <div style={alertBadge}>
            🔔 New Estimate Request
          </div>
          
          <Heading style={h2}>New Estimate Submitted</Heading>
          
          <Text style={paragraph}>
            A new estimate request has been submitted and requires your attention.
          </Text>

          <Section style={customerBox}>
            <Heading style={h3}>Customer Information</Heading>
            <Row style={infoRow}>
              <Column>
                <Text style={label}>Name:</Text>
              </Column>
              <Column>
                <Text style={value}>{customerName}</Text>
              </Column>
            </Row>
            <Row style={infoRow}>
              <Column>
                <Text style={label}>Email:</Text>
              </Column>
              <Column>
                <Link href={`mailto:${customerEmail}`} style={linkValue}>
                  {customerEmail}
                </Link>
              </Column>
            </Row>
            <Row style={infoRow}>
              <Column>
                <Text style={label}>Phone:</Text>
              </Column>
              <Column>
                <Link href={`tel:${customerPhone}`} style={linkValue}>
                  {customerPhone}
                </Link>
              </Column>
            </Row>
          </Section>

          <Section style={estimateBox}>
            <Heading style={h3}>Estimate Details</Heading>
            <div style={estimateContent}>
              {estimateDetails.split('\n').map((line, index) => (
                <Text key={index} style={estimateItem}>
                  {line}
                </Text>
              ))}
            </div>
            
            <Hr style={divider} />
            
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Total Amount:</Text>
              </Column>
              <Column align="right">
                <Text style={totalAmount}>${totalAmount.toLocaleString()}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={actionSection}>
            <Text style={paragraph}>
              <strong>Next Steps:</strong>
            </Text>
            <ul style={actionList}>
              <li style={actionItem}>Review the estimate details above</li>
              <li style={actionItem}>Contact the customer if modifications are needed</li>
              <li style={actionItem}>Process the approval when ready</li>
            </ul>
            
            <Section style={buttonContainer}>
              <Button style={button} href={approvalUrl}>
                View Full Estimate
              </Button>
            </Section>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ This estimate was automatically generated and sent to the customer. Please review and follow up accordingly.
            </Text>
          </Section>
        </Section>

        <Hr style={footerDivider} />

        <Section style={footer}>
          <Text style={footerText}>
            This notification was sent to all administrators regarding a new estimate request.
          </Text>
          <Text style={footerText}>
            {businessName} Admin System
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default AdminNotificationEmail

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
  fontSize: '24px',
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

const alertBadge = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  fontSize: '14px',
  fontWeight: '600',
  padding: '8px 16px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
  border: '1px solid #fbbf24',
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const customerBox = {
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const estimateBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const infoRow = {
  margin: '8px 0',
}

const label = {
  color: '#475569',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
  width: '80px',
}

const value = {
  color: '#1e293b',
  fontSize: '14px',
  margin: '0',
}

const linkValue = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'none',
  margin: '0',
}

const estimateContent = {
  margin: '12px 0',
}

const estimateItem = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '4px 0',
  fontFamily: 'monospace',
}

const divider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
}

const totalRow = {
  margin: '12px 0 0',
}

const totalLabel = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
}

const totalAmount = {
  color: '#059669',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
}

const actionSection = {
  margin: '24px 0',
}

const actionList = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '12px 0',
  paddingLeft: '20px',
}

const actionItem = {
  margin: '4px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  lineHeight: '1',
}

const warningBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const warningText = {
  color: '#991b1b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
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