"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeographicData {
  country: string;
  countryCode: string;
  users: number;
  revenue?: number;
  appointments?: number;
  growth: number;
  coordinates: [number, number]; // [lat, lng]
}

interface GeographicVisualizationProps {
  className?: string;
  data?: GeographicData[];
}

export function GeographicVisualization({ className, data: propData }: GeographicVisualizationProps) {
  const [data, setData] = useState<GeographicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  useEffect(() => {
    // Mock data inspired by the reference image
    const mockData: GeographicData[] = [
      {
        country: "Canada",
        countryCode: "CA",
        users: 87162,
        revenue: 2450000,
        appointments: 1250,
        growth: 15.3,
        coordinates: [56.1304, -106.3468]
      },
      {
        country: "China", 
        countryCode: "CN",
        users: 90069,
        revenue: 1890000,
        appointments: 890,
        growth: 8.7,
        coordinates: [35.8617, 104.1954]
      },
      {
        country: "USA",
        countryCode: "US", 
        users: 45536,
        revenue: 3200000,
        appointments: 2100,
        growth: 22.1,
        coordinates: [37.0902, -95.7129]
      },
      {
        country: "Other",
        countryCode: "XX",
        users: 190904,
        revenue: 1200000,
        appointments: 750,
        growth: 5.2,
        coordinates: [0, 0]
      }
    ];

    setTimeout(() => {
      setData(propData || mockData);
      setIsLoading(false);
    }, 500);
  }, [propData]);

  const totalUsers = data.reduce((sum, country) => sum + country.users, 0);
  const totalRevenue = data.reduce((sum, country) => sum + (country.revenue || 0), 0);

  const getCountrySize = (users: number) => {
    const percentage = (users / totalUsers) * 100;
    if (percentage > 30) return 'large';
    if (percentage > 15) return 'medium';
    return 'small';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <Card className={cn("dashboard-card", className)}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Geographic Distribution</CardTitle>
          </div>
          <CardDescription>Global user reach and performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="skeleton h-48 w-full rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("dashboard-card", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription className="mt-1">
                {data.length} regions • {formatNumber(totalUsers)} total users
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {formatNumber(totalUsers)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* World Map Visualization (Simplified) */}
        <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6 h-48">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Globe className="h-16 w-16 text-primary/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Interactive map visualization
              </p>
              <p className="text-xs text-muted-foreground">
                {data.length} countries tracked
              </p>
            </div>
          </div>

          {/* Country Data Points */}
          <div className="absolute inset-4 grid grid-cols-2 gap-2">
            {data.slice(0, 4).map((country, index) => (
              <div
                key={country.countryCode}
                className={cn(
                  "p-3 rounded-md bg-card/80 backdrop-blur-sm border border-border/50 cursor-pointer transition-all duration-300 hover:bg-card hover:shadow-md",
                  selectedCountry === country.countryCode && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedCountry(
                  selectedCountry === country.countryCode ? null : country.countryCode
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-2">
                  <MapPin className={cn(
                    "h-4 w-4",
                    getCountrySize(country.users) === 'large' ? "text-primary" :
                    getCountrySize(country.users) === 'medium' ? "text-secondary" : "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{country.country}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(country.users)} users
                    </p>
                  </div>
                  {country.growth > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <TrendingUp className="h-2 w-2 mr-1" />
                      {country.growth.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Country Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.map((country, index) => (
            <div
              key={country.countryCode}
              className={cn(
                "p-4 rounded-lg border transition-all duration-300 cursor-pointer hover:shadow-md slide-up",
                selectedCountry === country.countryCode 
                  ? "bg-primary/5 border-primary" 
                  : "bg-card hover:bg-accent"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setSelectedCountry(
                selectedCountry === country.countryCode ? null : country.countryCode
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{country.country}</h4>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    getCountrySize(country.users) === 'large' ? "bg-primary" :
                    getCountrySize(country.users) === 'medium' ? "bg-secondary" : "bg-muted-foreground"
                  )} />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Users</span>
                    <span className="text-sm font-semibold">{formatNumber(country.users)}</span>
                  </div>
                  
                  {country.revenue && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Revenue</span>
                      <span className="text-sm font-semibold">{formatCurrency(country.revenue)}</span>
                    </div>
                  )}
                  
                  {country.appointments && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Appointments</span>
                      <span className="text-sm font-semibold">{country.appointments}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Growth</span>
                    <span className={cn(
                      "text-sm font-semibold flex items-center gap-1",
                      country.growth > 0 ? "text-success" : "text-destructive"
                    )}>
                      {country.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                      {country.growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatNumber(totalUsers)}</p>
            <p className="text-sm text-muted-foreground">Total Users Reached</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.length}</p>
            <p className="text-sm text-muted-foreground">Active Regions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 