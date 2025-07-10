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

interface EstimateEmailProps {
  customerName: string
  estimateDetails: string
  totalAmount: number
  approvalUrl: string
  businessName?: string
  businessLogo?: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
}

export const EstimateEmail = ({
  customerName,
  estimateDetails,
  totalAmount,
  approvalUrl,
  businessName = "Mobile Home Solutions",
  businessLogo,
  businessAddress,
  businessPhone,
  businessEmail,
}: EstimateEmailProps) => (
  <Html>
    <Head />
    <Preview>Your mobile home estimate is ready for review</Preview>
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
          <Heading style={h2}>Your Estimate is Ready!</Heading>
          
          <Text style={paragraph}>
            Dear {customerName},
          </Text>
          
          <Text style={paragraph}>
            Thank you for your interest in our mobile homes. We've prepared a detailed estimate for you based on your requirements.
          </Text>

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

          <Section style={buttonContainer}>
            <Button style={button} href={approvalUrl}>
              Review & Approve Estimate
            </Button>
          </Section>

          <Text style={paragraph}>
            This estimate is valid for 30 days. If you have any questions or would like to discuss any modifications, please don't hesitate to contact us.
          </Text>

          <Text style={paragraph}>
            We appreciate your business and look forward to helping you with your mobile home needs.
          </Text>

          <Text style={signature}>
            Best regards,<br />
            The {businessName} Team
          </Text>
        </Section>

        <Hr style={footerDivider} />

        <Section style={footer}>
          {businessAddress && (
            <Text style={footerText}>
              📍 {businessAddress}
            </Text>
          )}
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
            This email was sent regarding your mobile home estimate request.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EstimateEmail

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

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const estimateBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
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
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
}

const totalAmount = {
  color: '#059669',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
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