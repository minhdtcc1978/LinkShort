'use client';

import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, LinkIcon, Eye, Zap } from 'lucide-react';

interface AnalyticsData {
  totalLinks: number;
  totalClicks: number;
  averageClicksPerLink: number;
  topLinks: Array<{ name: string; clicks: number }>;
  linksCreatedTrend: Array<{ date: string; links: number }>;
}

interface AnalyticsDashboardProps {
  links: any[];
}

export function AnalyticsDashboard({ links }: AnalyticsDashboardProps) {
  const analytics = useMemo(() => {
    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const averageClicksPerLink = totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0;

    // Get top 5 links by clicks
    const topLinks = [...links]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5)
      .map((link) => ({
        name: link.customAlias || link.shortCode,
        clicks: link.clicks || 0,
      }));

    // Real trend: number of links actually created on each of the last 7 days
    // (click-level timestamps aren't stored, so we don't fabricate a per-day click curve)
    const days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const linksCreatedTrend = days.map((day) => {
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const count = links.filter((link) => {
        const created = new Date(link.createdAt).getTime();
        return created >= day.getTime() && created < nextDay.getTime();
      }).length;
      return {
        date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        links: count,
      };
    });

    return {
      totalLinks,
      totalClicks,
      averageClicksPerLink,
      topLinks,
      linksCreatedTrend,
    };
  }, [links]);

  const COLORS = ['#7c3aed', '#3b82f6', '#06b6d4', '#a78bfa', '#ec4899'];

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto mt-16">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h2>
        <p className="text-gray-400">Track your link performance and engagement metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Links</p>
              <p className="text-3xl font-bold text-white">{analytics.totalLinks}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
              <LinkIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Clicks</p>
              <p className="text-3xl font-bold text-white">{analytics.totalClicks}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Avg Clicks/Link</p>
              <p className="text-3xl font-bold text-white">{analytics.averageClicksPerLink}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-card border-purple-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Engagement</p>
              <p className="text-3xl font-bold text-white">
                {analytics.totalLinks > 0
                  ? Math.round(
                      (links.filter((l) => l.clicks > 0).length / analytics.totalLinks) * 100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-pink-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-6">
        <TabsList className="bg-card border-purple-500/20 border">
          <TabsTrigger value="trend" className="data-[state=active]:bg-purple-600/20">
            Click Trend
          </TabsTrigger>
          <TabsTrigger value="toplinks" className="data-[state=active]:bg-purple-600/20">
            Top Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card className="bg-card border-purple-500/20 p-6">
            <h3 className="text-white font-semibold mb-4">Links Created (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={analytics.linksCreatedTrend}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3550" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1f3a',
                    border: '1px solid #2d3550',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#f5f7ff' }}
                />
                <Line
                  type="monotone"
                  dataKey="links"
                  stroke="#7c3aed"
                  dot={{ fill: '#7c3aed', r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="toplinks">
          <Card className="bg-card border-purple-500/20 p-6">
            <h3 className="text-white font-semibold mb-4">Top Performing Links</h3>
            {analytics.topLinks.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.topLinks}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d3550" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f3a',
                      border: '1px solid #2d3550',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f5f7ff' }}
                  />
                  <Bar dataKey="clicks" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-8">No click data yet</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
