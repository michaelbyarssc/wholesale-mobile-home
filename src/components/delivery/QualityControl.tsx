import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  MapPin,
  Camera,
  Clock,
  Shield
} from "lucide-react";

interface QualityControlProps {
  deliveryId: string;
  assignmentId: string;
  currentStatus: string;
  onValidationComplete?: (passed: boolean) => void;
}

interface ValidationResult {
  category: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  requirements?: string[];
  current?: number;
  required?: number;
}

const REQUIRED_PHOTOS = {
  factory_pickup_in_progress: ['pickup_front', 'pickup_back', 'pickup_left', 'pickup_right'],
  factory_pickup_completed: ['pickup_front', 'pickup_back', 'pickup_left', 'pickup_right'],
  delivery_in_progress: ['delivery_front', 'delivery_back', 'delivery_left', 'delivery_right'],
  delivered: ['delivery_front', 'delivery_back', 'delivery_left', 'delivery_right', 'signature']
};

const STATUS_REQUIREMENTS = {
  factory_pickup_in_progress: {
    gpsAccuracy: 50,
    photosRequired: true,
    locationRequired: true
  },
  factory_pickup_completed: {
    gpsAccuracy: 50,
    photosRequired: true,
    locationRequired: true
  },
  in_transit: {
    gpsAccuracy: 50,
    photosRequired: false,
    locationRequired: true
  },
  delivery_in_progress: {
    gpsAccuracy: 50,
    photosRequired: true,
    locationRequired: true
  },
  delivered: {
    gpsAccuracy: 50,
    photosRequired: true,
    locationRequired: true,
    signatureRequired: true
  }
} as const;

type StatusRequirement = {
  gpsAccuracy: number;
  photosRequired: boolean;
  locationRequired: boolean;
  signatureRequired?: boolean;
};

export const QualityControl = ({ deliveryId, assignmentId, currentStatus, onValidationComplete }: QualityControlProps) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const results: ValidationResult[] = [];
      
      // Get current data for validation
      const [photosResult, gpsResult, assignmentResult] = await Promise.all([
        supabase
          .from('delivery_photos')
          .select('*')
          .eq('delivery_id', deliveryId),
        supabase
          .from('delivery_gps_tracking')
          .select('*')
          .eq('delivery_id', deliveryId)
          .order('timestamp', { ascending: false })
          .limit(1),
        supabase
          .from('delivery_assignments')
          .select('*')
          .eq('id', assignmentId)
          .single()
      ]);

      const photos = photosResult.data || [];
      const latestGPS = gpsResult.data?.[0];
      const assignment = assignmentResult.data;

      // Validate photos
      const requiredPhotos = REQUIRED_PHOTOS[currentStatus as keyof typeof REQUIRED_PHOTOS] || [];
      if (requiredPhotos.length > 0) {
        const photoCategories = photos.map(p => p.photo_category).filter(Boolean);
        const missingPhotos = requiredPhotos.filter(cat => !photoCategories.includes(cat as any));
        
        results.push({
          category: 'Photos',
          passed: missingPhotos.length === 0,
          message: missingPhotos.length === 0 
            ? `All ${requiredPhotos.length} required photos captured`
            : `Missing ${missingPhotos.length} required photos`,
          severity: missingPhotos.length === 0 ? 'info' : 'error',
          requirements: requiredPhotos,
          current: requiredPhotos.length - missingPhotos.length,
          required: requiredPhotos.length
        });
      }

      // Validate GPS accuracy
      const requirements = STATUS_REQUIREMENTS[currentStatus as keyof typeof STATUS_REQUIREMENTS];
      if (requirements?.gpsAccuracy && latestGPS) {
        const accuracyMet = latestGPS.accuracy_meters <= requirements.gpsAccuracy;
        results.push({
          category: 'GPS Accuracy',
          passed: accuracyMet,
          message: accuracyMet 
            ? `GPS accuracy within required threshold (${latestGPS.accuracy_meters}m ≤ ${requirements.gpsAccuracy}m)`
            : `GPS accuracy insufficient (${latestGPS.accuracy_meters}m > ${requirements.gpsAccuracy}m)`,
          severity: accuracyMet ? 'info' : 'error',
          current: latestGPS.accuracy_meters,
          required: requirements.gpsAccuracy
        });
      } else if (requirements?.locationRequired) {
        results.push({
          category: 'GPS Location',
          passed: false,
          message: 'No GPS location data found',
          severity: 'error'
        });
      }

      // Validate mileage tracking
      if (assignment) {
        const hasMileage = assignment.starting_mileage !== null;
        results.push({
          category: 'Mileage Tracking',
          passed: hasMileage,
          message: hasMileage 
            ? 'Starting mileage recorded'
            : 'Starting mileage not recorded',
          severity: hasMileage ? 'info' : 'warning'
        });
      }

      // Validate signature for completed deliveries
      if ((requirements as any)?.signatureRequired) {
        const hasSignature = photos.some(p => p.photo_category === 'signature');
        results.push({
          category: 'Customer Signature',
          passed: hasSignature,
          message: hasSignature 
            ? 'Customer signature captured'
            : 'Customer signature required',
          severity: hasSignature ? 'info' : 'error'
        });
      }

      // Check for any reported issues
      const { data: issues } = await supabase
        .from('delivery_issues')
        .select('*')
        .eq('delivery_id', deliveryId)
        .eq('resolved_at', null);

      if (issues && issues.length > 0) {
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        results.push({
          category: 'Delivery Issues',
          passed: criticalIssues.length === 0,
          message: criticalIssues.length > 0 
            ? `${criticalIssues.length} critical issues unresolved`
            : `${issues.length} issues reported but none critical`,
          severity: criticalIssues.length > 0 ? 'error' : 'warning'
        });
      } else {
        results.push({
          category: 'Delivery Issues',
          passed: true,
          message: 'No issues reported',
          severity: 'info'
        });
      }

      return results;
    },
    onSuccess: (results) => {
      setValidationResults(results);
      const passedCount = results.filter(r => r.passed).length;
      const score = Math.round((passedCount / results.length) * 100);
      setOverallScore(score);
      
      const allCriticalPassed = results.filter(r => r.severity === 'error').every(r => r.passed);
      onValidationComplete?.(allCriticalPassed);
      
      if (allCriticalPassed) {
        toast.success(`Quality validation passed (${score}%)`);
      } else {
        toast.error(`Quality validation failed (${score}%)`);
      }
    },
    onError: (error) => {
      toast.error(`Validation failed: ${error.message}`);
    }
  });

  // Auto-validate when status changes
  useEffect(() => {
    if (deliveryId && assignmentId) {
      runValidation();
    }
  }, [deliveryId, assignmentId, currentStatus]);

  const runValidation = () => {
    setIsValidating(true);
    validateMutation.mutate();
    setTimeout(() => setIsValidating(false), 1000);
  };

  const getResultIcon = (result: ValidationResult) => {
    if (result.passed) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (result.severity === 'error') return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  };

  const getOverallColor = () => {
    if (overallScore >= 90) return 'text-green-600';
    if (overallScore >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const criticalIssues = validationResults.filter(r => r.severity === 'error' && !r.passed);
  const allCriticalPassed = criticalIssues.length === 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quality Control Validation
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getOverallColor()}`}>
              {overallScore}%
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={runValidation}
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Quality Score</span>
            <span>{validationResults.filter(r => r.passed).length}/{validationResults.length} checks passed</span>
          </div>
          <Progress value={overallScore} className="h-2" />
        </div>

        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{criticalIssues.length} critical issue(s) must be resolved before proceeding:</strong>
              <ul className="list-disc list-inside mt-1">
                {criticalIssues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Results */}
        <div className="space-y-3">
          {validationResults.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded border">
              {getResultIcon(result)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{result.category}</span>
                  <Badge variant={result.passed ? "default" : result.severity === 'error' ? "destructive" : "secondary"}>
                    {result.passed ? "Passed" : result.severity === 'error' ? "Failed" : "Warning"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                
                {result.requirements && (
                  <div className="mt-2 text-xs">
                    <span className="font-medium">Required: </span>
                    {result.requirements.join(', ')}
                  </div>
                )}
                
                {typeof result.current === 'number' && typeof result.required === 'number' && (
                  <div className="mt-1">
                    <Progress 
                      value={(result.current / result.required) * 100} 
                      className="h-1"
                    />
                    <span className="text-xs text-muted-foreground">
                      {result.current} / {result.required}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Validation Status Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Status: {allCriticalPassed ? 'Ready to Proceed' : 'Issues Must Be Resolved'}
            </span>
            <div className="flex items-center gap-2">
              {allCriticalPassed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
        </div>

        {/* Quality Guidelines */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Quality Standards:</strong>
            <ul className="list-disc list-inside mt-1 text-sm space-y-1">
              <li>GPS accuracy must be within 50 meters</li>
              <li>All required photos must be captured clearly</li>
              <li>Mileage must be recorded for tracking</li>
              <li>Critical issues must be resolved before completion</li>
              <li>Customer signature required for delivery completion</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};