import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, DollarSign, TrendingUp, PieChart } from 'lucide-react';

interface FinancingResults {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  monthlyBreakdown: {
    principal: number;
    interest: number;
    taxes: number;
    insurance: number;
    total: number;
  };
}

interface AmortizationRow {
  month: number;
  principalPayment: number;
  interestPayment: number;
  remainingBalance: number;
  totalInterest: number;
}

export const FinancingCalculator = () => {
  const [homePrice, setHomePrice] = useState<string>('75000');
  const [downPayment, setDownPayment] = useState<string>('15000');
  const [downPaymentType, setDownPaymentType] = useState<'amount' | 'percentage'>('amount');
  const [interestRate, setInterestRate] = useState<string>('7.5');
  const [loanTerm, setLoanTerm] = useState<string>('20');
  const [loanType, setLoanType] = useState<string>('chattel');
  const [propertyTaxes, setPropertyTaxes] = useState<string>('1200');
  const [insurance, setInsurance] = useState<string>('800');
  const [results, setResults] = useState<FinancingResults | null>(null);
  const [amortization, setAmortization] = useState<AmortizationRow[]>([]);

  const calculateFinancing = () => {
    const price = parseFloat(homePrice) || 0;
    const rate = parseFloat(interestRate) / 100 / 12; // Monthly rate
    const term = parseFloat(loanTerm) * 12; // Months
    const taxes = parseFloat(propertyTaxes) / 12; // Monthly taxes
    const ins = parseFloat(insurance) / 12; // Monthly insurance

    let downAmt: number;
    if (downPaymentType === 'percentage') {
      downAmt = price * (parseFloat(downPayment) / 100);
    } else {
      downAmt = parseFloat(downPayment) || 0;
    }

    const loanAmount = price - downAmt;

    if (loanAmount <= 0 || rate <= 0 || term <= 0) {
      setResults(null);
      setAmortization([]);
      return;
    }

    // Calculate monthly principal and interest payment
    const monthlyPI = loanAmount * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    const totalPayment = monthlyPI * term;
    const totalInterest = totalPayment - loanAmount;

    // Generate amortization schedule (first 12 months for display)
    const amortizationSchedule: AmortizationRow[] = [];
    let balance = loanAmount;
    let totalInterestPaid = 0;

    for (let month = 1; month <= Math.min(term, 12); month++) {
      const interestPayment = balance * rate;
      const principalPayment = monthlyPI - interestPayment;
      balance -= principalPayment;
      totalInterestPaid += interestPayment;

      amortizationSchedule.push({
        month,
        principalPayment,
        interestPayment,
        remainingBalance: balance,
        totalInterest: totalInterestPaid
      });
    }

    setResults({
      monthlyPayment: monthlyPI + taxes + ins,
      totalInterest,
      totalPayment: totalPayment + (taxes + ins) * term,
      monthlyBreakdown: {
        principal: monthlyPI - (balance * rate), // First month approximation
        interest: balance * rate, // First month
        taxes,
        insurance: ins,
        total: monthlyPI + taxes + ins
      }
    });
    setAmortization(amortizationSchedule);
  };

  useEffect(() => {
    calculateFinancing();
  }, [homePrice, downPayment, downPaymentType, interestRate, loanTerm, loanType, propertyTaxes, insurance]);

  const getLoanTypeDescription = (type: string) => {
    switch (type) {
      case 'chattel': return 'Personal property loan (most common for mobile homes)';
      case 'conventional': return 'Traditional mortgage with land';
      case 'fha': return 'FHA loan with lower down payment requirements';
      case 'va': return 'VA loan for eligible veterans';
      case 'cash': return 'Cash purchase - no financing needed';
      default: return '';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Calculator className="h-6 w-6 text-primary" />
          Mobile Home Financing Calculator
        </CardTitle>
        <p className="text-muted-foreground">
          Calculate your estimated monthly payments and explore financing options
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="homePrice">Home Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="homePrice"
                  type="number"
                  value={homePrice}
                  onChange={(e) => setHomePrice(e.target.value)}
                  placeholder="75000"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Down Payment</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder={downPaymentType === 'amount' ? '15000' : '20'}
                    className="pl-10"
                  />
                </div>
                <Select value={downPaymentType} onValueChange={(value: 'amount' | 'percentage') => setDownPaymentType(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">$</SelectItem>
                    <SelectItem value="percentage">%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="7.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanTerm">Loan Term (Years)</Label>
              <Select value={loanTerm} onValueChange={setLoanTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 years</SelectItem>
                  <SelectItem value="20">20 years</SelectItem>
                  <SelectItem value="25">25 years</SelectItem>
                  <SelectItem value="30">30 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loanType">Loan Type</Label>
              <Select value={loanType} onValueChange={setLoanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chattel">Chattel Loan</SelectItem>
                  <SelectItem value="conventional">Conventional Mortgage</SelectItem>
                  <SelectItem value="fha">FHA Loan</SelectItem>
                  <SelectItem value="va">VA Loan</SelectItem>
                  <SelectItem value="cash">Cash Purchase</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getLoanTypeDescription(loanType)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyTaxes">Property Taxes (Annual)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="propertyTaxes"
                    type="number"
                    value={propertyTaxes}
                    onChange={(e) => setPropertyTaxes(e.target.value)}
                    placeholder="1200"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insurance">Insurance (Annual)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="insurance"
                    type="number"
                    value={insurance}
                    onChange={(e) => setInsurance(e.target.value)}
                    placeholder="800"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {results && loanType !== 'cash' ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <div className="text-3xl font-bold text-primary">
                          ${results.monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-muted-foreground">Monthly Payment</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Interest</p>
                            <p className="font-semibold">${results.totalInterest.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Payment</p>
                            <p className="font-semibold">${results.totalPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="breakdown" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Principal & Interest</span>
                          <span className="font-medium">
                            ${(results.monthlyBreakdown.principal + results.monthlyBreakdown.interest).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Property Taxes</span>
                          <span className="font-medium">
                            ${results.monthlyBreakdown.taxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insurance</span>
                          <span className="font-medium">
                            ${results.monthlyBreakdown.insurance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-semibold">
                          <span>Total Monthly Payment</span>
                          <span>${results.monthlyBreakdown.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <h4 className="font-semibold">First Year Amortization</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {amortization.map((row) => (
                            <div key={row.month} className="grid grid-cols-4 gap-2 text-sm">
                              <span className="font-medium">Month {row.month}</span>
                              <span>${row.principalPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                              <span>${row.interestPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                              <span>${row.remainingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground border-t pt-2">
                          <span>Month</span>
                          <span>Principal</span>
                          <span>Interest</span>
                          <span>Balance</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : loanType === 'cash' ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      ${parseFloat(homePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-muted-foreground">Cash Purchase</p>
                    <p className="text-sm text-muted-foreground">
                      No monthly payments required. Consider ongoing costs like taxes and insurance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    Enter loan details to see payment calculations
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>* Calculations are estimates only</p>
              <p>* Actual rates and terms may vary</p>
              <p>* Contact us for personalized financing options</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};