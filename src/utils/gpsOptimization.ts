// GPS tracking optimization utilities
import { supabase } from "@/integrations/supabase/client";

export interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
  batteryLevel?: number;
}

export interface GPSBatch {
  points: GPSPoint[];
  deliveryId: string;
  driverId: string;
  batchStartTime: Date;
  batchEndTime: Date;
}

class GPSOptimizer {
  private batchQueue: GPSPoint[] = [];
  private lastSignificantPoint: GPSPoint | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly deliveryId: string;
  private readonly driverId: string;
  
  // Configuration
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 300000; // 5 minutes
  private readonly MIN_DISTANCE_THRESHOLD = 10; // meters
  private readonly MIN_ACCURACY_THRESHOLD = 50; // meters
  private readonly MIN_TIME_BETWEEN_POINTS = 30000; // 30 seconds

  constructor(deliveryId: string, driverId: string) {
    this.deliveryId = deliveryId;
    this.driverId = driverId;
  }

  // Calculate distance between two GPS points using Haversine formula
  private calculateDistance(point1: GPSPoint, point2: GPSPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Determine if GPS point is significant enough to track
  private isSignificantPoint(newPoint: GPSPoint): boolean {
    // Always include points with high accuracy
    if (newPoint.accuracy <= 10) return true;

    // Skip points with poor accuracy
    if (newPoint.accuracy > this.MIN_ACCURACY_THRESHOLD) return false;

    // If no previous significant point, this is significant
    if (!this.lastSignificantPoint) return true;

    // Check time threshold
    const timeDiff = newPoint.timestamp.getTime() - this.lastSignificantPoint.timestamp.getTime();
    if (timeDiff < this.MIN_TIME_BETWEEN_POINTS) return false;

    // Check distance threshold
    const distance = this.calculateDistance(this.lastSignificantPoint, newPoint);
    if (distance < this.MIN_DISTANCE_THRESHOLD) return false;

    // Check speed change (if available)
    if (newPoint.speed && this.lastSignificantPoint.speed) {
      const speedDiff = Math.abs(newPoint.speed - this.lastSignificantPoint.speed);
      if (speedDiff > 2.237) return true; // 5 mph change
    }

    return true;
  }

  // Add GPS point to optimization queue
  public addGPSPoint(point: GPSPoint): boolean {
    if (!this.isSignificantPoint(point)) {
      return false; // Point not significant enough
    }

    this.batchQueue.push(point);
    this.lastSignificantPoint = point;

    // Auto-flush if batch is full
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch();
      return true;
    }

    // Set timer for batch timeout if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.BATCH_TIMEOUT);
    }

    return true;
  }

  // Flush current batch to database
  public async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch: GPSBatch = {
      points: [...this.batchQueue],
      deliveryId: this.deliveryId,
      driverId: this.driverId,
      batchStartTime: this.batchQueue[0].timestamp,
      batchEndTime: this.batchQueue[this.batchQueue.length - 1].timestamp
    };

    try {
      // Insert batch to database
      const { error } = await supabase.functions.invoke('process-gps-batch', {
        body: batch
      });

      if (error) {
        console.error('Failed to process GPS batch:', error);
        // Re-queue failed points for retry
        return;
      }

      console.log(`Successfully processed GPS batch of ${batch.points.length} points`);
      
      // Clear processed batch
      this.batchQueue = [];
      
      // Clear timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }

    } catch (error) {
      console.error('GPS batch processing failed:', error);
    }
  }

  // Get adaptive tracking interval based on movement and battery
  public getAdaptiveInterval(
    isMoving: boolean,
    batteryLevel?: number,
    accuracy?: number
  ): number {
    let interval = 60000; // Base 60 seconds

    // Adjust based on movement
    if (isMoving) {
      interval = 30000; // 30 seconds when moving
    } else {
      interval = 120000; // 2 minutes when stationary
    }

    // Adjust based on battery level
    if (batteryLevel && batteryLevel < 20) {
      interval *= 2; // Double interval for low battery
    } else if (batteryLevel && batteryLevel > 80) {
      interval *= 0.8; // Slightly more frequent for good battery
    }

    // Adjust based on GPS accuracy
    if (accuracy && accuracy > 50) {
      interval *= 1.5; // Less frequent for poor accuracy
    }

    return Math.max(30000, Math.min(300000, interval)); // Min 30s, max 5min
  }

  // Force flush on cleanup
  public cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushBatch();
  }
}

// Performance monitoring for GPS tracking
export class GPSPerformanceMonitor {
  private metrics = {
    totalPoints: 0,
    filteredPoints: 0,
    averageAccuracy: 0,
    batteryDrain: 0,
    networkRequests: 0,
    lastUpdate: new Date()
  };

  public recordGPSPoint(point: GPSPoint, wasFiltered: boolean): void {
    this.metrics.totalPoints++;
    if (wasFiltered) this.metrics.filteredPoints++;
    
    // Update average accuracy
    this.metrics.averageAccuracy = 
      (this.metrics.averageAccuracy * (this.metrics.totalPoints - 1) + point.accuracy) / this.metrics.totalPoints;
    
    this.metrics.lastUpdate = new Date();
  }

  public recordNetworkRequest(): void {
    this.metrics.networkRequests++;
  }

  public getPerformanceMetrics() {
    return {
      ...this.metrics,
      filterEfficiency: this.metrics.totalPoints > 0 ? 
        (this.metrics.filteredPoints / this.metrics.totalPoints) * 100 : 0,
      pointsPerMinute: this.getPointsPerMinute()
    };
  }

  private getPointsPerMinute(): number {
    const now = new Date();
    const timeDiff = now.getTime() - this.metrics.lastUpdate.getTime();
    const minutes = timeDiff / (1000 * 60);
    return minutes > 0 ? this.metrics.totalPoints / minutes : 0;
  }
}

export default GPSOptimizer;