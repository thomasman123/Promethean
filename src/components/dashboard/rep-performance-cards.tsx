"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  Calendar, 
  DollarSign, 
  Target,
  Star,
  Clock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface RepPerformanceData {
  id: string;
  name: string;
  role: "closer" | "setter";
  avatar?: string;
  metrics: {
    appointments?: number;
    dials?: number;
    revenue?: number;
    closeRate?: number;
    appointmentRate?: number;
    leadQuality?: number;
    avgResponseTime?: number;
  };
  trends: {
    appointments?: number;
    dials?: number;
    revenue?: number;
    closeRate?: number;
    appointmentRate?: number;
    leadQuality?: number;
  };
  performance: "excellent" | "good" | "needs-improvement";
}

interface RepPerformanceCardsProps {
  className?: string;
}

export function RepPerformanceCards({ className }: RepPerformanceCardsProps) {
  const { selectedAccountId } = useAuth();
  const [closers, setClosers] = useState<RepPerformanceData[]>([]);
  const [setters, setSetters] = useState<RepPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRepData = async () => {
      if (!selectedAccountId) return;
      
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/team/performance?accountId=${selectedAccountId}`);
        // const data = await response.json();
        
        // Mock data for now
        const mockClosers: RepPerformanceData[] = [
          {
            id: "closer-1",
            name: "John Davis",
            role: "closer",
            avatar: "/avatars/john.jpg",
            metrics: {
              appointments: 45,
              revenue: 125000,
              closeRate: 0.28,
              leadQuality: 8.5,
              avgResponseTime: 120
            },
            trends: {
              appointments: 0.12,
              revenue: 0.15,
              closeRate: 0.03,
              leadQuality: 0.05
            },
            performance: "good"
          },
          {
            id: "closer-2", 
            name: "Mike Rogers",
            role: "closer",
            avatar: "/avatars/mike.jpg",
            metrics: {
              appointments: 38,
              revenue: 98000,
              closeRate: 0.31,
              leadQuality: 7.8,
              avgResponseTime: 90
            },
            trends: {
              appointments: -0.03,
              revenue: -0.02,
              closeRate: 0.02,
              leadQuality: -0.01
            },
            performance: "good"
          },
          {
            id: "closer-3",
            name: "Sarah Lee", 
            role: "closer",
            avatar: "/avatars/sarah.jpg",
            metrics: {
              appointments: 52,
              revenue: 156000,
              closeRate: 0.25,
              leadQuality: 9.1,
              avgResponseTime: 180
            },
            trends: {
              appointments: 0.18,
              revenue: 0.22,
              closeRate: -0.02,
              leadQuality: 0.08
            },
            performance: "excellent"
          }
        ];

        const mockSetters: RepPerformanceData[] = [
          {
            id: "setter-1",
            name: "Alex Brown",
            role: "setter",
            avatar: "/avatars/alex.jpg",
            metrics: {
              dials: 156,
              appointments: 23,
              appointmentRate: 0.147,
              leadQuality: 7.9,
              avgResponseTime: 45
            },
            trends: {
              dials: 0.08,
              appointments: 0.12,
              appointmentRate: 0.04,
              leadQuality: 0.02
            },
            performance: "good"
          },
          {
            id: "setter-2",
            name: "Emma Wilson",
            role: "setter", 
            avatar: "/avatars/emma.jpg",
            metrics: {
              dials: 142,
              appointments: 19,
              appointmentRate: 0.134,
              leadQuality: 8.1,
              avgResponseTime: 38
            },
            trends: {
              dials: -0.02,
              appointments: -0.05,
              appointmentRate: -0.03,
              leadQuality: 0.01
            },
            performance: "needs-improvement"
          },
          {
            id: "setter-3",
            name: "Chris Park",
            role: "setter",
            avatar: "/avatars/chris.jpg", 
            metrics: {
              dials: 178,
              appointments: 28,
              appointmentRate: 0.157,
              leadQuality: 8.7,
              avgResponseTime: 52
            },
            trends: {
              dials: 0.15,
              appointments: 0.18,
              appointmentRate: 0.03,
              leadQuality: 0.06
            },
            performance: "excellent"
          }
        ];

        setClosers(mockClosers);
        setSetters(mockSetters);
      } catch (error) {
        console.error("Failed to load rep performance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRepData();
  }, [selectedAccountId]);

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'time':
        return `${Math.floor(value / 60)}m ${value % 60}s`;
      case 'rating':
        return value.toFixed(1);
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-3 w-3" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  const getTrendClass = (trend: number) => {
    if (trend > 0) return "metric-change positive";
    if (trend < 0) return "metric-change negative";
    return "metric-change";
  };

  const RepCard = ({ rep, index }: { rep: RepPerformanceData; index: number }) => (
    <Card 
      className={cn(
        "rep-card slide-up",
        `performance-indicator ${rep.performance}`
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={rep.avatar} alt={rep.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-semibold">
              {rep.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{rep.name}</h3>
            <Badge 
              variant={rep.role === 'closer' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {rep.role === 'closer' ? 'Closer' : 'Setter'}
            </Badge>
          </div>
          <div className={`performance-indicator ${rep.performance}`}>
            <Star className="h-3 w-3" />
            {rep.performance === 'excellent' ? 'Top' : rep.performance === 'good' ? 'Good' : 'Focus'}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="space-y-3">
          {rep.role === 'closer' ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Appointments</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{rep.metrics.appointments}</div>
                  <div className={getTrendClass(rep.trends.appointments || 0)}>
                    {getTrendIcon(rep.trends.appointments || 0)}
                    {Math.abs((rep.trends.appointments || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Revenue</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.revenue || 0, 'currency')}</div>
                  <div className={getTrendClass(rep.trends.revenue || 0)}>
                    {getTrendIcon(rep.trends.revenue || 0)}
                    {Math.abs((rep.trends.revenue || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Close Rate</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.closeRate || 0, 'percentage')}</div>
                  <div className={getTrendClass(rep.trends.closeRate || 0)}>
                    {getTrendIcon(rep.trends.closeRate || 0)}
                    {Math.abs((rep.trends.closeRate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Lead Quality</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.leadQuality || 0, 'rating')}</div>
                  <div className={getTrendClass(rep.trends.leadQuality || 0)}>
                    {getTrendIcon(rep.trends.leadQuality || 0)}
                    {Math.abs((rep.trends.leadQuality || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Dials</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{rep.metrics.dials}</div>
                  <div className={getTrendClass(rep.trends.dials || 0)}>
                    {getTrendIcon(rep.trends.dials || 0)}
                    {Math.abs((rep.trends.dials || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Appointments</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{rep.metrics.appointments}</div>
                  <div className={getTrendClass(rep.trends.appointments || 0)}>
                    {getTrendIcon(rep.trends.appointments || 0)}
                    {Math.abs((rep.trends.appointments || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Appt Rate</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.appointmentRate || 0, 'percentage')}</div>
                  <div className={getTrendClass(rep.trends.appointmentRate || 0)}>
                    {getTrendIcon(rep.trends.appointmentRate || 0)}
                    {Math.abs((rep.trends.appointmentRate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Lead Quality</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.leadQuality || 0, 'rating')}</div>
                  <div className={getTrendClass(rep.trends.leadQuality || 0)}>
                    {getTrendIcon(rep.trends.leadQuality || 0)}
                    {Math.abs((rep.trends.leadQuality || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="metric-label">Avg Response</span>
                </div>
                <div className="text-right">
                  <div className="metric-value text-lg">{formatValue(rep.metrics.avgResponseTime || 0, 'time')}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Closers Section Skeleton */}
        <div className="space-y-4">
          <div className="skeleton h-6 w-32 rounded"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={`closer-skeleton-${i}`} className="rep-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-10 w-10 rounded-full"></div>
                      <div className="space-y-1 flex-1">
                        <div className="skeleton h-4 w-24 rounded"></div>
                        <div className="skeleton h-3 w-16 rounded"></div>
                      </div>
                    </div>
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <div className="skeleton h-3 w-20 rounded"></div>
                        <div className="skeleton h-4 w-16 rounded"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Setters Section Skeleton */}
        <div className="space-y-4">
          <div className="skeleton h-6 w-32 rounded"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={`setter-skeleton-${i}`} className="rep-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-10 w-10 rounded-full"></div>
                      <div className="space-y-1 flex-1">
                        <div className="skeleton h-4 w-24 rounded"></div>
                        <div className="skeleton h-3 w-16 rounded"></div>
                      </div>
                    </div>
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="flex justify-between">
                        <div className="skeleton h-3 w-20 rounded"></div>
                        <div className="skeleton h-4 w-16 rounded"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Closers Section */}
      <div className="space-y-4 slide-up">
        <h2 className="section-header">Closers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {closers.map((closer, index) => (
            <RepCard key={closer.id} rep={closer} index={index} />
          ))}
        </div>
      </div>

      {/* Setters Section */}
      <div className="space-y-4 slide-up" style={{ animationDelay: '200ms' }}>
        <h2 className="section-header">Setters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {setters.map((setter, index) => (
            <RepCard key={setter.id} rep={setter} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
} 